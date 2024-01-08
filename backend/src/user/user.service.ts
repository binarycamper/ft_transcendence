import {
	BadRequestException,
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
import * as fs from 'fs';
import { unlink } from 'fs/promises';
import { FriendRequest } from 'src/chat/friendRequest.entity';

const UPLOAD_PATH = '/usr/src/app/uploads/';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
		@InjectRepository(AuthToken)
		private readonly authTokenRepository: Repository<AuthToken>,
		private jwtService: JwtService,
		@InjectRepository(FriendRequest)
		private friendRequestRepository: Repository<FriendRequest>,
	) {}

	findAll(): Promise<User[]> {
		return this.userRepository.find({ relations: ['friends', 'blocklist', 'chatRooms'] });
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
				'name',
				'nickname',
				'status',
				'intraId',
				'intraImage',
				'customImage',
				'has2FA',
				'TFASecret',
				'unconfirmed2FASecret',
				'friends',
				'blocklist',
				'chatRooms',
			],
			relations: ['friends', 'blocklist', 'chatRooms'],
		});
		if (!user) {
			throw new Error('User not found');
		}
		return user;
	}

	//findUserCreditsById

	async findUserCreditsById(userId: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			select: [
				'id',
				'email',
				'name',
				'nickname',
				'status',
				'intraId',
				'intraImage',
				'customImage',
				'has2FA',
				'TFASecret',
				'unconfirmed2FASecret',
				'friends',
				'password',
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
			relations: ['friends', 'blocklist'],
		});
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

	async findUserIdForLogin(email: string) {
		const user = await this.userRepository.findOne({
			where: { email: email },
			select: ['id'],
		});
		return user;
	}

	async findUserbyName(name: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { name: name },
			select: ['id', 'email', 'name', 'nickname', 'status', 'intraImage', 'customImage'],
		});
		return user;
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
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['friends'],
		});
		if (!user) {
			throw new NotFoundException('User not found');
		}

		// Get all friend requests where the user is either the sender or the recipient
		const friendRequests = await this.friendRequestRepository.find({
			where: [{ senderId: userId }, { recipientId: userId }],
		});

		// Remove all related friend requests
		if (friendRequests.length > 0) {
			await this.friendRequestRepository.remove(friendRequests);
		}

		//Deletes uploaded customImage
		if (userImage) {
			const imagePath = UPLOAD_PATH + userImage.split('?filename=').pop();
			try {
				if (fs.existsSync(imagePath)) {
					await unlink(imagePath);
				}
			} catch (error) {
				console.error('Failed to delete user image:', error);
			}
		}

		const authToken = await this.authTokenRepository.findOne({
			where: { userId: user.id },
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

	async removeFriend(
		userId: string,
		friendId: string,
	): Promise<{ removed: boolean; message: string }> {
		let removed = false;
		let message = '';

		await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
			const user = await transactionalEntityManager.findOne(User, {
				where: { id: userId },
				relations: ['friends'],
			});

			if (!user) {
				throw new Error('User not found');
			}
			//TODO: Wrong logic, block fails here even if they re friends!
			if (user.friends.some((friend) => friend.id === friendId)) {
				// Remove the friend from the user's list of friends
				user.friends = user.friends.filter((friend) => friend.id !== friendId);
				await transactionalEntityManager.save(user);
			} else {
				console.log('User does not have this friend on their list, user friends: ', user);
				return { removed, message };
			}

			const friend = await transactionalEntityManager.findOne(User, {
				where: { id: friendId },
				relations: ['friends'],
			});

			// Check and remove the friend from the user's list
			if (user.friends.some((friend) => friend.id === friendId)) {
				user.friends = user.friends.filter((friend) => friend.id !== friendId);
				await transactionalEntityManager.save(user);
				removed = true;
				message = 'Friend removed successfully.';
			} else {
				message = 'User does not have this friend on their list.';
			}

			// Check and remove the user from the friend's list
			if (friend && friend.friends.some((f) => f.id === userId)) {
				friend.friends = friend.friends.filter((f) => f.id !== userId);
				await transactionalEntityManager.save(friend);
				removed = true;
				message = 'Friend removed successfully.';
			} else {
				message = message || 'Friend does not have this user on their list.';
			}
		});

		return { removed, message };
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
		const newFilePath = UPLOAD_PATH + newFilename;

		// Delete old customImage if it exists
		if (user.customImage) {
			const oldFilename = user.customImage.split('?filename=').pop();
			const oldFilePath = UPLOAD_PATH + oldFilename;
			if (fs.existsSync(oldFilePath)) {
				await unlink(oldFilePath);
			}
		}

		// Save the new customImage
		const writeStream = fs.createWriteStream(newFilePath);
		writeStream.write(file.buffer);

		// Update user with new customImage URL which is also the request for itself
		user.customImage = `http://localhost:8080/user/uploads?filename=${newFilename}`;
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

	async blockUser(currUser: User, userName: string): Promise<User> {
		// Retrieve the user with their current relations
		const userWithRelations = await this.userRepository.findOne({
			where: { id: currUser.id },
			relations: ['friends', 'blocklist'],
		});
		if (!userWithRelations) {
			throw new NotFoundException('User not found');
		}

		// Check if the user is already in the blocklist
		const isAlreadyBlocked = userWithRelations.blocklist.some(
			(blockedUser) => blockedUser.name === userName,
		);
		if (isAlreadyBlocked) {
			throw new BadRequestException('User already blocked');
		}

		//get UserToBlock with relations
		const userToBlock = await this.userRepository.findOne({
			where: { name: userName },
			relations: ['friends', 'blocklist'],
		});
		if (!userToBlock) {
			throw new NotFoundException('User not found');
		}

		//block User
		userWithRelations.blocklist.push(userToBlock);
		await this.userRepository.save(userWithRelations);
		return await this.userRepository.save(userWithRelations);
	}

	async findBlockedUsers(userId: string): Promise<User[]> {
		try {
			const user = await this.userRepository.findOne({
				where: { id: userId },
				relations: ['blocklist'],
			});

			if (!user) {
				throw new NotFoundException('User not found');
			}

			// Return the blocked users
			return user.blocklist;
		} catch (error) {
			throw new InternalServerErrorException('Could not retrieve blocked users');
		}
	}

	async removeUserInBlocklist(currUser: User, userName: string): Promise<User> {
		// Retrieve the user with their current relations
		const userWithRelations = await this.userRepository.findOne({
			where: { id: currUser.id },
			relations: ['friends', 'blocklist'],
		});
		if (!userWithRelations) {
			throw new NotFoundException('User not found');
		}

		// Find the user to be removed from the blocklist
		const userIndex = userWithRelations.blocklist.findIndex(
			(blockedUser) => blockedUser.name === userName,
		);

		// Check if the user is in the blocklist
		if (userIndex === -1) {
			throw new NotFoundException('User not in blocklist');
		}

		// Remove the user from the blocklist
		userWithRelations.blocklist.splice(userIndex, 1);

		// Save the updated user
		await this.userRepository.save(userWithRelations);

		// Return the updated user
		return userWithRelations;
	}

	//debug:
	async createDebugUser(intraData: Partial<User>): Promise<User> {
		// Create a new User entity with the provided data
		const newUser = this.userRepository.create(intraData);

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
