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

	@UseGuards(JwtAuthGuard, StatusGuard)
	@Post('complete')
	async completeProfile(
		@Body() body: { nickname: string; password: string },
		@Req() req,
		@Res() res: Response,
	) {
		//console.log('Request headers:', req.headers);
		//console.log('Request body:', body);
		// With JwtAuthGuard used, you can now access the user from the request object
		const userId = req.user?.id; // The user property is attached to the request by JwtAuthGuard

		//console.log('userid: ', userId);
		if (!userId) {
			throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
		}

		const isProfileComplete = await this.userService.isProfileComplete(userId);
		if (isProfileComplete) {
			throw new HttpException(
				{
					status: HttpStatus.SEE_OTHER,
					error: 'Profile already complete, use Profile-page to change pw!',
					location: '/', // Indicating the location where the client should redirect
				},
				HttpStatus.SEE_OTHER,
			);
		}

		//TODO: Default pw && default nickname. need other solution Just handle unique names!
		if (!body.nickname || !body.password) {
			throw new HttpException(
				{
					status: HttpStatus.BAD_REQUEST,
					error: 'Invalid nickname or password',
					location: '/user/complete',
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		// Call the service method to update the nickname and password
		const updatedUser = await this.userService.complete(
			userId,
			body.nickname,
			body.password,
		);

		// Return a success response
		res.status(HttpStatus.OK).json({ message: 'Profile updated successfully' });
	}

	@Post('/register')
	async create(@Body() createUserDto: CreateUserDto): Promise<User> {
		this.logger.log(`Registering user with email: ${createUserDto.email}`);
		try {
			const newUser = await this.userService.create(createUserDto);
			this.logger.log(`Registered user with id: ${newUser.id}`);
			return newUser;
		} catch (error) {
			this.logger.error(`Registration failed: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Get('/users')
	async getAll(): Promise<User[]> {
		return this.userService.findAll();
	}

	@Post('/update')
	async editUser(
		@Body() updateUserDto: CreateUserDto,
		@Query('userId') userId: string,
	): Promise<User> {
		return this.userService.update(userId, updateUserDto);
	}

	@Post(':userId/friends/:friendId')
	async addFriend(
		@Param('userId') userId: string,
		@Param('friendId') friendId: string,
	) {
		return this.userService.addFriend(userId, friendId);
	}

	@Delete(':userId/friends/:friendId')
	async removeFriend(
		@Param('userId') userId: string,
		@Param('friendId') friendId: string,
	) {
		return this.userService.removeFriend(userId, friendId);
	}
	/*@UseGuards(JwtAuthGuard) // Add this line to guard the endpoint
	@Post('complete-profile')
	async completeProfile(@Body() completeProfileDto: CompleteProfileDto, @Req() req, @Res() res) {
	  if (!req.user || !req.user.id) {
	    return res.status(401).send({ message: 'User not authenticated' });
	  }
	  await this.userService.completeProfile(req.user.id, completeProfileDto);
	  return res.status(200).send({ message: 'Profile completed successfully' });
	}

	@UseGuards(JwtAuthGuard) // Add this line to guard the endpoint
	@Get('is-profile-complete')
	async isProfileComplete(@Req() req, @Res() res) {
	  console.log('req.user:', req.user); // Log the req.user object
	  if (!req.user || !req.user.id) {
	    return res.status(401).send({ message: 'User not authenticated' });
	  }
	  const isComplete = await this.userService.isProfileComplete(req.user.id);
	  return res.status(200).send({ isComplete });
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	async getCurrentUser(@Req() req): Promise<User> {
	  return this.userService.findOne(req.user.id);
	}

	@Get()
	findAll() {
		return this.userService.findAll();
	}

	@Get(':id')
    findOne(@Param('id') id: string) {
        return this.userService.findOne(id);
    }


	@Delete(':id')
    remove(@Param('id') id: string): Promise<void> {
        return this.userService.remove(id);
    }*/

	// Add other CRUD operations as needed
}
