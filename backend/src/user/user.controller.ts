import {
	Controller,
	Get,
	Param,
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
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Response } from 'express';
import { StatusGuard } from 'src/auth/guards/status.guard';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises'; // make sure to import unlink for file deletion
import * as fs from 'fs';

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
			const isComplete = await this.userService.isProfileComplete(userId);
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

		const isProfileComplete = await this.userService.isProfileComplete(userId);
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

		// Optional: Check if the user confirmed account deletion
		// This could be a flag sent from the client in the request body or as a query parameter
		// For example, let's assume it's sent as a query parameter
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
			res.status(HttpStatus.OK).json({ message: 'User deleted successfully' });

			if (image) {
				const imagePath = uploadPath + image.split('?filename=').pop();
				if (fs.existsSync(imagePath)) {
					await unlink(imagePath);
				}
			}
			// Optional: Perform any cleanup tasks, such as logging out the user
			// This might involve clearing any session or token information on the client side
		} catch (error) {
			console.error('Error deleting user:', error);
			throw new HttpException(
				'Failed to delete user',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	@Post('image')
	@UseGuards(JwtAuthGuard)
	@UseInterceptors(FileInterceptor('image'))
	async uploadImage(
		@UploadedFile() file: Express.Multer.File,
		@Req() req,
		@Res() res: Response,
	) {
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

		// Write the new file to the filesystem
		const writeStream = createWriteStream(savePath);
		writeStream.write(file.buffer);

		// Update the user entity with the new image
		await this.userService.updateUserImage(req.user.id, user.image);

		// Send response back to the client
		res.status(HttpStatus.OK).json({});
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
	async editName(
		@Body() body: { name: string },
		@Req() req,
		@Res() res: Response,
	) {
		const userId = req.user.id;
		const newName = body.name;

		// Check if the new name is unique
		const isNameTaken = await this.userService.isNameUnique(userId, newName);
		if (isNameTaken) {
			throw new BadRequestException('This name is already taken!!!!.');
		}
		try {
			const status = await this.userService.updateUserName(userId, newName);
			// Return a success response
			if (status)
				res
					.status(HttpStatus.OK)
					.json({ message: 'Name updated successfully' });
			else {
				res
					.status(HttpStatus.OK)
					.json({ message: 'Name was not changed, choose another one' });
			}
		} catch (error) {
			console.error('Error updating name:', error);
			throw new HttpException(
				'Failed to update name',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
