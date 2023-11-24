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

	//completes the users account, with the last step: create pw.
	async complete(userId: string, password: string): Promise<User> {
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			throw new Error('User not found');
		}

		// Update the user's password
		user.password = await bcrypt.hash(password, 10);
		user.status = 'created';

		// Save the updated user
		return this.userRepository.save(user);
	}

	//returns true when profile is created completely, or false if pw is not set or user not authenticated
	async isProfileComplete(userId: string): Promise<boolean> {
		const user = await this.userRepository.findOne({ where: { id: userId } });

		if (!user) {
			throw new Error('User not found');
		}

		const status = user.status === 'fresh';
		const profileComplete = user.email !== null && !status;

		return profileComplete;
	}

	//deletes a user by id, if u use in controller use jwt guard.
	async deleteUserById(userId: string): Promise<void> {
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			throw new NotFoundException('User not found');
		}

		try {
			await this.userRepository.remove(user);
		} catch (error) {
			throw new InternalServerErrorException('Error deleting user');
		}
	}

	//TODO: delete me, old code. Auth Module is the only creator of users.
	//Unused function atm
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

	//TODOO: Rework me, old implementation...
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

	//TODOO: Rework me maybe, old implementation...
	async findProfileById(userId: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
		});
		if (!user) {
			throw new Error('User not found');
		}
		return user;
	}
}
