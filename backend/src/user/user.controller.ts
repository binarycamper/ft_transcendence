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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { User } from './user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Response } from 'express';
import { StatusGuard } from 'src/auth/guards/status.guard';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises'; // make sure to import unlink for file deletion
import * as fs from 'fs';
import * as sharp from 'sharp';
import { getRepository } from 'typeorm';

const uploadPath = '/usr/src/app/uploads/';

@Controller('user')
export class UserController {
	private readonly logger = new Logger(UserController.name);
	constructor(private readonly userService: UserService) {}
	//Verify pw input and creates hash, it checks if user is allowed to do so Jwt + intern logic

	//returns all users
	@Get('users')
	async getAll(): Promise<User[]> {
		return this.userService.findAll();
	}

	@Get('isProfileComplete')
	async isProfileComplete(@Req() req: any, @Res() res: any) {
		try {
			const userId = req.user?.id; // Annahme, dass die Benutzer-ID aus der Anfrage verfügbar ist
			const isComplete = await this.userService.isProfilecreated(userId);
			res.json({ isComplete });
		} catch (error) {
			res.status(500).json({ error: 'Internal Server Error' });
		}
	}

	@UseGuards(JwtAuthGuard)
	@Post('complete')
	async completeProfile(
		@Body() body: { password: string },
		@Req() req,
		@Res() res: Response,
	) {
		//console.log('Request headers:', req.headers);
		//console.log('Request body:', body);
		// With JwtAuthGuard used, you can now access the user from the request object
		const userId = req.user?.id; // The user property is attached to the request by JwtAuthGuard
		//console.log('userid: ', userId);
		if (!userId) {
			console.log('!userId');
			throw new HttpException(
				{
					status: HttpStatus.UNAUTHORIZED,
					error:
						'Access Denied: You are not authorized to access this resource or your profile is not in a state that requires completion.',
					// Optionally, you can include a 'location' key if you want the frontend to redirect
					location: '/login', // This can be used by the frontend to redirect
				},
				HttpStatus.UNAUTHORIZED,
			);
		}

		const isProfileComplete = await this.userService.isProfilecreated(userId);
		if (isProfileComplete) {
			console.log('isProfileComplete');
			throw new HttpException(
				{
					status: HttpStatus.SEE_OTHER,
					error: 'Profile already complete, use Profile-page to change pw!',
					location: '/profile', // Indicating the location where the client should redirect
				},
				HttpStatus.SEE_OTHER,
			);
		}

		if (!body.password) {
			console.log('!body.password');
			throw new HttpException(
				{
					status: HttpStatus.BAD_REQUEST,
					error: 'Invalid password',
					location: '/signup',
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		// Call the service method to update password
		const updatedUser = await this.userService.complete(userId, body.password);

		// Return a success response
		res.status(HttpStatus.OK).json({ message: 'Profile updated successfully' });
	}

	//Get the profile, must be complete user, gets own profile, or redirect to auth pages if unauthenticated user
	@UseGuards(JwtAuthGuard, StatusGuard)
	@Get('profile')
	async getProfile(@Req() req) {
		// Access the user's ID from the request object
		const userId = req.user.id;
		const userProfile = await this.userService.findProfileById(userId);

		// Exclude password and other sensitive fields from the result
		const { password, id, ...result } = userProfile;

		return result;
	}

	//Deletes own user account  //Todo: check edgecases!
	@UseGuards(JwtAuthGuard)
	@Delete('delete')
	async deleteUser(@Req() req, @Res() res: Response) {
		// Access the user's ID from the request object, injected by JwtAuthGuard
		const userId = req.user.id;
		const image: string = req.user.image;

		const confirmDeletion = req.query.confirm === 'true';

		if (!confirmDeletion) {
			// If the user did not confirm deletion, send a bad request response
			return res.status(HttpStatus.BAD_REQUEST).json({
				message: 'Confirmation required to delete account',
			});
		}

		try {
			// Call the service method to delete the user
			await this.userService.deleteUserById(userId);

			// Return a success response

			if (image) {
				const imagePath = uploadPath + image.split('?filename=').pop();
				if (fs.existsSync(imagePath)) {
					await unlink(imagePath);
				}
			}
			// Optional: Perform any cleanup tasks, such as logging out the user
			res.clearCookie('token', {
				sameSite: 'none',
				secure: true,
			});

			res.status(HttpStatus.OK).json({ message: 'User deleted successfully' });
			// This might involve clearing any session or token information on the client side
		} catch (error) {
			console.error('Error deleting user:', error);
			throw new HttpException(
				'Failed to delete user',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	@UseGuards(JwtAuthGuard)
	@UseInterceptors(FileInterceptor('image'))
	@Post('uploadImage')
	async uploadImage(
		@UploadedFile() file: Express.Multer.File,
		@Req() req,
		@Res() res: Response,
	) {
		//file is empty?
		if (!file || file.size === 0) {
			res.status(HttpStatus.BAD_REQUEST).json({
				message: 'No file uploaded or file is empty.',
			});
			return;
		}

		// Image validation
		if (!(await this.isValidImage(file.buffer))) {
			res.status(HttpStatus.BAD_REQUEST).json({
				message: 'Invalid image file.',
			});
			return;
		}
		const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes

		// Check the file's size
		if (file.size > MAX_FILE_SIZE) {
			// If the file size exceeds the maximum, return an error response
			res.status(HttpStatus.BAD_REQUEST).json({
				message: 'File size exceeds the maximum limit of 1MB.',
			});
			return;
		}

		const allowedMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png']);
		if (!allowedMimeTypes.has(file.mimetype)) {
			res
				.status(HttpStatus.BAD_REQUEST)
				.json({ message: 'Invalid file type. Only image files are allowed.' });
			return;
		}
		// Retrieve the existing user to check for an old image
		const user = await this.userService.findProfileById(req.user.id);
		//console.log('image: ', user.image);
		//console.log('imageUrl: ', user.imageUrl);
		if (!user) return;
		let oldFilePath = undefined;
		if (user.image) {
			oldFilePath = uploadPath + user.image.split('?filename=').pop();
		}
		file.filename = user.id + '.';
		file.filename = file.filename.concat(file.mimetype.split('/').pop());
		//console.log('filename!: ', file.filename);

		user.image = 'http://localhost:8080/user/uploads?filename=' + file.filename;

		//console.log('new image name: ', user.image);
		if (user && oldFilePath) {
			//console.log('string: ', oldFilePath);
			try {
				await unlink(oldFilePath);
				console.log(`Deleted old image: ${oldFilePath}`);
			} catch (error) {
				// Handle error (file might not exist, which is fine)
				console.error('Error deleting old image file:', error);
			}
		}
		const savePath = uploadPath + file.filename;
		const writeStream = createWriteStream(savePath);
		writeStream.write(file.buffer);
		await this.userService.updateUserImage(req.user.id, user.image);
		res.status(HttpStatus.OK).json({});
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
	async editNickName(
		@Body() body: { nickname: string },
		@Req() req,
		@Res() res: Response,
	) {
		const userId = req.user.id;
		const newName = body.nickname;
		if (newName == undefined) {
			//Todo: choose correct httpstatus!
			res
				.status(HttpStatus.NOT_IMPLEMENTED)
				.json({ message: 'Nickname body was wrong' });
		}

		// Check if the new name is unique
		const isNameTaken = await this.userService.isNameUnique(userId, newName);
		if (isNameTaken) {
			throw new BadRequestException('This Nickname is already taken!!!!.');
		}
		try {
			const status = await this.userService.updateUserName(userId, newName);
			console.log('statuts = ', status);
			if (status) {
				res
					.status(HttpStatus.OK)
					.json({ message: 'Nickname updated successfully' });
			} else {
				res
					.status(HttpStatus.OK)
					.json({ message: 'Nickname was not changed, choose another one' });
			}
		} catch (error) {
			console.error('Error updating Nickname:', error);
			throw new HttpException(
				'Failed to update Nickname',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
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
				return res
					.status(HttpStatus.NOT_FOUND)
					.json({ message: 'User not found' });
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
			res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ message: 'Error retrieving friends' });
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

		try {
			// Await the service method to add the friend
			const updatedUser = await this.userService.addFriend(userId, friendName);

			// Check if the update was successful
			if (!updatedUser) {
				return res
					.status(HttpStatus.NOT_FOUND)
					.json({ message: 'User not found' });
			}

			// You can choose to return the updated user or just a success message
			res.status(HttpStatus.OK).json({ message: 'Friend added successfully' });
		} catch (error) {
			console.error('Error adding friend:', error);
			res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ message: 'Error adding friend' });
		}
	}

	//Debug:
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
			image: 'someDebugImage',
			status: 'created',
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
