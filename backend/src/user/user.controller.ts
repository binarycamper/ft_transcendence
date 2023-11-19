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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.entity';

@Controller('user')
export class UserController {
	private readonly logger = new Logger(UserController.name);
	constructor(private readonly userService: UserService) {}

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
		@Query('userId') userId: string, //TODO: Use authtoken or Cookie instead id as query /user/update?${id}
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
