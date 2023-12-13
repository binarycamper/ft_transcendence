import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';
import { AuthToken } from 'src/auth/auth.entity';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import { unlink } from 'fs/promises';

const uploadPath = '/usr/src/app/uploads/';

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

	async findAllFriends(user: User): Promise<User[]> {
		// Assuming 'user' is the user entity of the currently logged-in user
		// and it has a 'friends' property that is a self-referencing many-to-many relation.

		// You need to load the friends relation, you can do this using the find method with options
		const friends = await this.userRepository.find({
			relations: ['friends'],
			where: { id: user.id },
		});

		// The 'friends' property of the user entity should now be populated.
		return friends.map((friend) => friend.friends).flat();
	}

	async findProfileById(userId: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			select: [
				'id',
				'email',
				'password',
				'name',
				'nickname',
				'status',
				'intraId',
				'imageUrl',
				'image',
				'isTwoFactorAuthenticationEnabled',
				'twoFactorAuthenticationSecret',
				'unconfirmedTwoFactorSecret',
				'friends',
			],
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

	async findUserIdByMail(email: string) {
		const user = await this.userRepository.findOne({
			where: { email: email },
		});
		if (!user) {
			return undefined;
		}
		return user.id;
	}

	//used from socket.io it event.gateway.ts
	async setUserOnline(userId: string): Promise<void> {
		// Logic to set the user's status to 'online' in the database
		const user = await this.userRepository.findOne({ where: { id: userId } });
		if (user && user.status !== 'fresh') {
			user.status = 'online';
			await this.userRepository.save(user);
		}
	}
	//used from socket.io it event.gateway.ts
	async setUserOffline(userId: string): Promise<void> {
		// Logic to set the user's status to 'offline' in the database
		const user = await this.userRepository.findOne({ where: { id: userId } });
		if (user && user.status !== 'fresh') {
			user.status = 'offline';
			await this.userRepository.save(user);
		}
	}

	//completes the users account, with the last step: create pw.
	async complete(userId: string, password: string): Promise<User> {
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			throw new Error('User not found');
		}

		// Update the user's password
		user.password = await bcrypt.hash(password, 10);
		user.status = 'online';

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

	async deleteUserById(userId: string, userImage: string): Promise<void> {
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			throw new NotFoundException('User not found');
		}
		if (userImage) {
			const imagePath = uploadPath + userImage.split('?filename=').pop();
			try {
				if (fs.existsSync(imagePath)) {
					await unlink(imagePath);
				}
			} catch (error) {
				console.error('Failed to delete user image:', error);
			}
		}

		const authToken = await this.authTokenRepository.findOne({
			where: { userId: user.intraId },
		});

		try {
			await this.userRepository.manager.transaction(async (entityManager) => {
				if (authToken) {
					await entityManager.remove(authToken);
				}
				await entityManager.remove(user);
			});
		} catch (error) {
			throw new InternalServerErrorException('Error deleting user and auth token');
		}
	}

	async updateUser(user: User): Promise<User> {
		return this.userRepository.save(user);
	}

	async saveUserImage(userId: string, file: Express.Multer.File): Promise<void> {
		const user = await this.findProfileById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}

		// Generate new filename
		const fileExtension = file.mimetype.split('/').pop();
		const newFilename = `${userId}.${fileExtension}`;
		const newFilePath = uploadPath + newFilename;

		// Delete old image if it exists
		if (user.image) {
			const oldFilename = user.image.split('?filename=').pop();
			const oldFilePath = uploadPath + oldFilename;
			if (fs.existsSync(oldFilePath)) {
				await unlink(oldFilePath);
			}
		}

		// Save the new image
		const writeStream = fs.createWriteStream(newFilePath);
		writeStream.write(file.buffer);

		// Update user with new image URL which is also the request for itself
		user.image = `http://localhost:8080/user/uploads?filename=${newFilename}`;
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
	async updateUserNickName(userId: string, newName: string): Promise<boolean> {
		const userToUpdate = await this.userRepository.findOne({
			where: {
				id: userId,
			},
		});
		if (!userToUpdate) {
			throw new NotFoundException('User not found.');
		}
		//console.log('usernickname: ', userToUpdate.nickname);
		//console.log('newname: ', newName);

		if (userToUpdate.nickname == newName) return false;
		userToUpdate.nickname = newName;
		await this.userRepository.save(userToUpdate);
		return true;
	}

	async addFriend(user: User, friendName: string): Promise<User> {
		// Retrieve the user with their current friends
		const userWithFriends = await this.userRepository.findOne({
			where: { id: user.id },
			relations: ['friends'],
		});
		if (!userWithFriends) {
			throw new Error('User not found');
		}
		const friendToAdd = await this.userRepository.findOne({
			where: { name: friendName },
		});
		if (!friendToAdd) {
			throw new Error('Friend not found');
		}
		// Ensure the user is not trying to add themselves as a friend
		if (userWithFriends.id === friendToAdd.id) {
			throw new Error('Users cannot add themselves as a friend');
		}
		// Check if they are already friends
		const alreadyFriends = userWithFriends.friends.some((f) => f.id === friendToAdd.id);
		if (alreadyFriends) {
			throw new Error('Already friends');
		}
		// Add new friend
		userWithFriends.friends.push(friendToAdd);
		return await this.userRepository.save(userWithFriends);
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
		const payload = {
			name: user.name,
			email: user.email,
			id: user.id,
			password: user.password,
			intraId: user.id,
		};
		return this.jwtService.sign(payload);
	}
}
