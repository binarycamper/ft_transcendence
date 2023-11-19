import {
	BadRequestException,
	ConflictException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
	) {}

	findAll(): Promise<User[]> {
		return this.userRepository.find();
	}

	async create(createUserDto: CreateUserDto): Promise<User> {
		// Check if a user with the given name or email already exists.
		const existingUser = await this.userRepository.findOne({
			where: [{ email: createUserDto.email }, { name: createUserDto.name }],
		});

		if (existingUser) {
			// If any of the unique fields match, throw an exception.
			throw new ConflictException('email or name already exists.');
		}
		// If there is no existing user, proceed to create a new one.
		const newUser = this.userRepository.create(createUserDto);
		newUser.password = await bcrypt.hash(createUserDto.password, 10);
		return this.userRepository.save(newUser);
	}

	//TODOO: Ask for password, before allowing editing
	async update(userId: string, updateUserDto: CreateUserDto): Promise<User> {
		// First, find the user by ID
		const userToUpdate = await this.userRepository.findOneBy({ id: userId });
		if (!userToUpdate) {
			throw new NotFoundException(`User with ID ${userId} not found`);
		}

		// Check if the updated username is unique (if it has been changed)
		if (updateUserDto.name && updateUserDto.name !== userToUpdate.name) {
			const existingUserByUsername = await this.userRepository.findOneBy({
				name: updateUserDto.name,
			});
			if (existingUserByUsername) {
				throw new ConflictException('Username already exists');
			}
		}

		// Check if the updated email is unique (if it has been changed)
		if (updateUserDto.email && updateUserDto.email !== userToUpdate.email) {
			const existingUserByEmail = await this.userRepository.findOneBy({
				email: updateUserDto.email,
			});
			if (existingUserByEmail) {
				throw new ConflictException('Email already exists');
			}
		}

		//hash the pw, anyway.
		updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
		// Update the user
		Object.assign(userToUpdate, updateUserDto);

		await this.userRepository.save(userToUpdate);

		return userToUpdate;
	}

	async addFriend(userId: string, friendId: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['friends'],
		});
		const friend = await this.userRepository.findOne({
			where: { id: friendId },
		});

		if (!user || !friend) {
			throw new NotFoundException('User not found.');
		}

		if (user.friends.some((f) => f.id === friendId)) {
			throw new BadRequestException('Users are already friends.');
		}
		user.friends.push(friend);
		return this.userRepository.save(user);
	}

	async removeFriend(userId: string, friendId: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['friends'],
		});

		if (!user) {
			throw new NotFoundException('User not found.');
		}

		user.friends = user.friends.filter((f) => f.id !== friendId);
		return this.userRepository.save(user);
	}
}
