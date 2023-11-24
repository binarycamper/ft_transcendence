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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Response } from 'express';
import { StatusGuard } from 'src/auth/guards/status.guard';

@Controller('user')
export class UserController {
	private readonly logger = new Logger(UserController.name);
	constructor(private readonly userService: UserService) {}

	//Verify pw input and creates hash, it checks if user is allowed to do so Jwt + intern logic
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
		if (!req.user?.id) {
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
			throw new HttpException(
				{
					status: HttpStatus.BAD_REQUEST,
					error: 'Invalid password',
					location: '/user/complete',
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

	//returns all users
	@Get('/users')
	async getAll(): Promise<User[]> {
		return this.userService.findAll();
	}

	//Todo: rework me old implementation
	@Post('/update')
	async editUser(
		@Body() updateUserDto: CreateUserDto,
		@Query('userId') userId: string,
	): Promise<User> {
		return this.userService.update(userId, updateUserDto);
	}
}
