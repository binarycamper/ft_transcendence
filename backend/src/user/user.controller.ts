import { Controller, Get, Param, Post, Body, Delete, Req, Res, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { CreateUserDto } from './dto/user.dto';
import { CompleteProfileDto } from './dto/completeProfile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Adjust the path based on your directory structure

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

	@UseGuards(JwtAuthGuard) // Add this line to guard the endpoint
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

	@Post()
	create(@Body() createUserDto: CreateUserDto): Promise<User> {
		return this.userService.create(createUserDto);
	}

	@Delete(':id')
    remove(@Param('id') id: string): Promise<void> {
        return this.userService.remove(id);
    }

    // Add other CRUD operations as needed
}
