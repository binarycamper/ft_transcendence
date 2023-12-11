import {
	Controller,
	Get,
	Post,
	Body,
	Delete,
	Req,
	Res,
	UseGuards,
	Query,
	Logger,
	HttpException,
	HttpStatus,
	UploadedFile,
	UseInterceptors,
	BadRequestException,
	UsePipes,
	ValidationPipe,
	UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { User } from './user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Response } from 'express';
import { StatusGuard } from 'src/auth/guards/status.guard';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import * as fs from 'fs';
import * as sharp from 'sharp';
import { EditNicknameDto } from './dto/userName.dto';
import { CompleteProfileDto } from './dto/completeProfile.dto';

const uploadPath = '/usr/src/app/uploads/';

@Controller('user')
export class UserController {
	private readonly logger = new Logger(UserController.name);
	constructor(private readonly userService: UserService) {}

	//returns all users
	@Get('users')
	async getAll(): Promise<User[]> {
		return this.userService.findAll();
	}

	@Get('isProfileComplete')
	@UseGuards(JwtAuthGuard)
	async isProfileComplete(@Req() req): Promise<{ isComplete: boolean }> {
		const userId = req.user?.id;
		const isComplete = await this.userService.isProfilecreated(userId);
		return { isComplete };
	}

	//complete Profile and set your first Password
	@UseGuards(JwtAuthGuard)
	@Post('complete')
	@UsePipes(new ValidationPipe())
	async completeProfile(
		@Body() completeProfileDto: CompleteProfileDto,
		@Req() req,
		@Res() res: Response,
	) {
		const userId = req.user?.id;
		if (!userId) {
			throw new UnauthorizedException({
				status: HttpStatus.UNAUTHORIZED,
				error:
					'Access Denied: You are not authorized to access this resource or your profile is not in a state that requires completion.',
				location: '/login',
			});
		}
		const isProfileComplete = await this.userService.isProfilecreated(userId);
		if (isProfileComplete) {
			throw new HttpException('Profile already complete!', HttpStatus.SEE_OTHER);
		}
		if (!completeProfileDto.password) {
			throw new BadRequestException('Invalid password');
		}

		await this.userService.complete(userId, completeProfileDto.password);
		return res.status(HttpStatus.OK).json({ message: 'Profile updated successfully' });
	}

	//Get the profile, must be complete user, render own profile, or redirect to signup if client has no account
	@UseGuards(JwtAuthGuard, StatusGuard)
	@Get('profile')
	async getProfile(@Req() req) {
		const userId = req.user.id;
		const userProfile = await this.userService.findProfileById(userId);

		// Exclude password and other sensitive fields from the result
		//console.log('user profile data: ', userProfile.status);
		const { password, id, ...result } = userProfile;

		return result;
	}

	@UseGuards(JwtAuthGuard)
	@Delete('delete')
	async deleteUser(
		@Req() req,
		@Query('confirm') confirmDeletion: boolean,
	): Promise<{ message: string }> {
		if (!confirmDeletion) {
			throw new BadRequestException('Confirmation required to delete account');
		}

		await this.userService.deleteUserById(req.user.id, req.user.image);
		req.res.clearCookie('token', { sameSite: 'none', secure: true });
		return { message: 'User deleted successfully' };
	}

	@UseGuards(JwtAuthGuard)
	@UseInterceptors(FileInterceptor('image'))
	@Post('uploadImage')
	async uploadImage(
		@UploadedFile() file: Express.Multer.File,
		@Req() req,
	): Promise<{ message: string }> {
		if (!file || file.size === 0) {
			throw new BadRequestException('No file uploaded or file is empty.');
		}

		if (!(await this.isValidImage(file.buffer))) {
			throw new BadRequestException('Invalid image file.');
		}

		const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
		if (file.size > MAX_FILE_SIZE) {
			throw new BadRequestException('File size exceeds the maximum limit of 1MB.');
		}

		const allowedMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png']);
		if (!allowedMimeTypes.has(file.mimetype)) {
			throw new BadRequestException('Invalid file type. Only jpeg/jpg/png files are allowed.');
		}

		await this.userService.saveUserImage(req.user.id, file);

		return { message: 'Image uploaded successfully' };
	}

	private async isValidImage(fileBuffer: Buffer): Promise<boolean> {
		try {
			await sharp(fileBuffer).metadata();
			return true;
		} catch (error) {
			console.error('Invalid image file:', error);
			return false;
		}
	}

	//get ProfileImage of user
	@UseGuards(JwtAuthGuard)
	@Get('uploads')
	async getImage(@Query('filename') filename: string, @Res() res: Response) {
		// Construct the full file path
		const fullPath = uploadPath + filename;
		//console.log('FilePath= ', fullPath);

		// Check if the file exists and send it, otherwise send a 404 response
		if (fs.existsSync(fullPath)) {
			return res.status(HttpStatus.OK).sendFile(fullPath);
		} else {
			return res.status(HttpStatus.NOT_FOUND).send('File not found');
		}
	}

	@UseGuards(JwtAuthGuard)
	@Post('editName')
	async editNickName(@Body() editNicknameDto: EditNicknameDto, @Req() req, @Res() res: Response) {
		const userId = req.user.id;
		const newName = editNicknameDto.nickname;

		// Check if the new name is unique
		const isNameTaken = await this.userService.isNameUnique(userId, newName);
		if (isNameTaken) {
			throw new BadRequestException('This Nickname is already taken.');
		}

		try {
			const status = await this.userService.updateUserNickName(userId, newName);
			if (status) {
				res.status(HttpStatus.OK).json({ message: 'Nickname updated successfully' });
			} else {
				res.status(HttpStatus.OK).json({ message: 'Nickname was not changed, choose another one' });
			}
		} catch (error) {
			console.error('Error updating Nickname:', error);
			throw new HttpException('Failed to update Nickname', HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	//Get List of friends of that user
	@UseGuards(JwtAuthGuard)
	@Get('friends')
	async getFriends(@Req() req, @Res() res: Response) {
		const userId = req.user.id;
		try {
			const user = await this.userService.findProfileById(userId);
			if (!user) {
				return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });
			}

			if (!user.friends) {
				return res.status(HttpStatus.OK).json([]); // Send an empty array if no friends are found
			}

			const friends = user.friends.map((friend) => {
				const { password, ...friendDetails } = friend; // Exclude sensitive information
				return friendDetails;
			});

			res.status(HttpStatus.OK).json(friends); // Send the list of friends in the response
		} catch (error) {
			console.error('Error retrieving friends:', error);
			res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error retrieving friends' });
		}
	}

	@UseGuards(JwtAuthGuard)
	@Post('addFriend')
	async addFriend(
		@Req() req,
		@Body('friendName') friendName: string, // Assuming you send the friend's ID in the request body
		@Res() res: Response,
	) {
		const userId = req.user.id; // Retrieve the user's ID from the request
		console.log('USER ID= ', userId);
		try {
			//TOdo: Avoid adding own account. atm is used for debugging.
			// Await the service method to add the friend
			const updatedUser = await this.userService.addFriend(userId, friendName);

			// Check if the update was successful
			if (!updatedUser) {
				return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });
			}

			// You can choose to return the updated user or just a success message
			res.status(HttpStatus.OK).json({ message: 'Friend added successfully' });
		} catch (error) {
			console.error('Error adding friend:', error);
			res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error adding friend' });
		}
	}

	@UseGuards(JwtAuthGuard)
	@Get('publicprofile')
	async getPublicProfile(@Query('friendname') friendname: string, @Req() req) {
		// Access the user's ID from the request object

		const friendProfile = await this.userService.findProfileByName(friendname);

		// Exclude password and other sensitive fields from the result
		const { password, id, intraId, ...result } = friendProfile;

		return result;
	}

	//Debug: TODO: Delete for eval && create correct token! jwt.sign(payload)
	//This is a hypothetical service method that you would call to create a debug user.
	@Post('createDebugUser')
	async createDebugUser(@Res() res: Response) {
		// Create a new User entity
		const debugUser = await this.userService.createDebugUser({
			name: 'DebugUser',
			nickname: 'Debugger',
			email: 'debug@example.com',
			password: '1', // Make sure this is hashed as per your auth strategy
			intraId: 'someDebugIntraId',
			imageUrl: 'someDebugImageUrl',
			image: 'http://localhost:8080/user/uploads?filename=DebugUser.png',
			status: 'offline',
		});

		const debugToken = await this.userService.createDebugToken(debugUser);

		// Respond with the newly created debug user's ID and the fake token
		res.status(HttpStatus.CREATED).json({
			message: 'Debug user created',
			userId: debugUser.id,
			debugToken: debugToken, // Include the token in the response
		});
	}
}
