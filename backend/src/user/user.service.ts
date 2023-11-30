import {
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';
import { AuthToken } from 'src/auth/auth.entity';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
		@InjectRepository(AuthToken)
		private readonly authTokenRepository: Repository<AuthToken>,
	) {}

	findAll(): Promise<User[]> {
		return this.userRepository.find();
	}

	async findProfileById(userId: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
		});
		if (!user) {
			throw new Error('User not found');
		}
		return user;
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

	//returns true when profile is created completely
	async isProfileComplete(userId: string): Promise<boolean> {
		const user = await this.userRepository.findOne({ where: { id: userId } });

		if (!user) {
			throw new Error('User not found');
		}
		const status = user.status !== 'fresh';
		return status;
	}

	//deletes a user by id, if u use in controller use jwt guard.
	async deleteUserById(userId: string): Promise<void> {
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			throw new NotFoundException('User not found');
		}

		const authToken = await this.authTokenRepository.findOne({
			where: { user: user },
		});

		try {
			await this.userRepository.manager.transaction(async (entityManager) => {
				if (authToken) {
					await entityManager.remove(authToken);
				}
				await entityManager.remove(user);
			});
		} catch (error) {
			throw new InternalServerErrorException(
				'Error deleting user and auth token',
			);
		}
	}

	// In your UserService
	async updateUserImage(userId: string, image: string): Promise<void> {
		// Fetch the user by id
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			throw new NotFoundException('User not found');
		}

		// Update the image field
		user.image = image;

		// Save the user entity
		await this.userRepository.save(user);
	}

	//Todo: write logic here: Check subject!!
	//checks if given 'newName' is unique
	async isNameUnique(userId: string, newName: string): Promise<Boolean> {
		return true;
	}

	//Changes User.name entry database
	async updateUserName(userId: string, newName: string): Promise<void> {}

	//Changes User.password entry database
	async updateUserPassword(userId: string, newName: string): Promise<void> {}
}
