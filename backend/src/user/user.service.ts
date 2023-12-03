import {
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';
import { AuthToken } from 'src/auth/auth.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
		@InjectRepository(AuthToken)
		private readonly authTokenRepository: Repository<AuthToken>,
		private jwtService: JwtService,
	) {}

	findAll(): Promise<User[]> {
		return this.userRepository.find();
	}

	async findProfileById(userId: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['friends'],
		});
		if (!user) {
			throw new Error('User not found');
		}
		return user;
	}

	async findProfileByName(friendName: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { name: friendName },
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
	async isProfilecreated(userId: string): Promise<boolean> {
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

	//Updates UserImage string
	async updateUserImage(userId: string, image: string): Promise<void> {
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			throw new NotFoundException('User not found');
		}
		user.image = image;
		await this.userRepository.save(user);
	}

	//checks if given 'newName' is unique
	async isNameUnique(userId: string, newName: string): Promise<boolean> {
		// Logic to check if the name is unique
		const existingUser = await this.userRepository.findOne({
			where: {
				nickname: newName,
				id: Not(userId), // Exclude the current user from the check
			},
		});
		if (existingUser === null) return false;
		return true; // Return true if no other user has the same name, false otherwise
	}

	//Changes User.name entry database
	async updateUserName(userId: string, newName: string): Promise<boolean> {
		const userToUpdate = await this.userRepository.findOne({
			where: {
				id: userId,
			},
		});
		if (!userToUpdate) {
			throw new NotFoundException('User not found.');
		}
		console.log('usernickname: ', userToUpdate.nickname);
		console.log('newname: ', newName);

		if (userToUpdate.nickname == newName) return false;
		userToUpdate.nickname = newName;
		await this.userRepository.save(userToUpdate);
		return true;
	}

	async addFriend(userId: string, friendName: string): Promise<User | null> {
		// Suppose we are using an ORM like TypeORM to handle the database operation
		// Assuming `userId` and `friendId` are strings and match the primary key type of your User entity
		const user = await this.userRepository.findOne({ where: { id: userId } });
		const friend = await this.userRepository.findOne({
			where: { name: friendName },
		});

		if (!user || !friend) {
			return null; // Return null if either user is not found
		}

		// Initialize friends as an empty array if it's not iterable
		if (!Array.isArray(user.friends)) {
			user.friends = [];
		}

		// Check if the friend is already in the user's friends list
		if (
			user.friends.some((existingFriend) => existingFriend.id === friend.id)
		) {
			return user; // Or handle this case as you see fit (e.g., throw an error)
		}

		// Add the friend to the user's friends array
		user.friends.push(friend);

		// Save the updated user
		await this.userRepository.save(user);

		return user; // Return the updated user
	}

	//debug:
	async createDebugUser(userData: Partial<User>): Promise<User> {
		// Create a new User entity with the provided data
		const newUser = this.userRepository.create(userData);

		// Hash the password before saving
		newUser.password = await bcrypt.hash(newUser.password, 10);

		// Save the new user to the database
		return this.userRepository.save(newUser);
	}

	async createDebugToken(user: User): Promise<string> {
		const payload = { username: user.nickname, sub: user.id };
		return this.jwtService.sign(payload);
	}
}
