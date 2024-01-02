import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FriendRequest } from './friendRequest.entity';
import { Server } from 'socket.io';
import { FriendRequestDto } from './friendRequest.dto';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/user.entity';
import { ChatMessage } from './chat.entity';
import { ChatRoom } from './chatRoom.entity';
import { CreateChatRoomDto } from './dto/chatRoom.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ChatService {
	private server: Server; // This should be injected or set from outside, probably from your WebSocket gateway

	constructor(
		@InjectRepository(FriendRequest)
		private readonly friendrequestRepository: Repository<FriendRequest>,
		private userService: UserService,
		@InjectRepository(ChatMessage)
		private chatMessageRepository: Repository<ChatMessage>,
		@InjectRepository(ChatRoom)
		private chatRoomRepository: Repository<ChatRoom>,
	) {}

	setServer(server: Server) {
		this.server = server;
	}

	//########################CHatRooms#############################

	async getChatRoomById(roomId: string): Promise<ChatRoom> {
		return await this.chatRoomRepository.findOne({
			where: { id: roomId },
			relations: ['users'],
		});
	}

	async findChatRoomByName(chatRoomName: string) {
		//console.log('chatRoomData: ', chatRoomData);
		// Check for unique chat room name
		const existingChatRoom = await this.chatRoomRepository.findOne({
			where: { name: chatRoomName },
		});
		return existingChatRoom;
	}

	async createChatRoom(chatRoomData: CreateChatRoomDto) {
		//console.log('chatRoomData: ', chatRoomData);
		if (chatRoomData.type === 'public' && chatRoomData.password) {
			const hashedPassword = await bcrypt.hash(chatRoomData.password, 10);
			chatRoomData.password = hashedPassword;
		}
		const chatRoom = await this.chatRoomRepository.create(chatRoomData);
		//chatRoom.ownerId = chatRoomData.ownerId;
		//console.log('chatRoom = ', chatRoom);
		return await this.chatRoomRepository.save(chatRoom);
	}

	async saveChatRoomMessage(chatRoomId: string, senderId: string, content: string) {
		const sender = await this.userService.findProfileById(senderId);
		const now = new Date();
		// Assuming ChatMessage is a class that corresponds to your database schema
		const message = new ChatMessage();
		message.senderId = senderId;
		message.receiverId = chatRoomId; // Make sure this is correct - for a chat room, you might not need a receiverId.
		message.senderName = sender.name;
		message.content = content;
		message.createdAt = now;

		// Save the message to the message repository
		await this.chatMessageRepository.save(message);

		// Find the chat room
		const chatRoom = await this.chatRoomRepository.findOne({ where: { id: chatRoomId } });

		// Check if the chat room was found
		if (chatRoom) {
			// If chatRoom.messages is not initialized, initialize it or load it
			if (!chatRoom.messages) {
				chatRoom.messages = [];
			}
			// Add the message to the chat room's messages
			chatRoom.messages.push(message);
			// Save the chat room with the new message
			await this.chatRoomRepository.save(chatRoom);
			return message;
		} else {
			// Handle the case where the chat room is not found
			throw new Error('Chat room not found');
		}
	}

	async findChatRoomChat(chatRoomId: string): Promise<ChatMessage[]> {
		try {
			const chatRoomHistory = await this.chatMessageRepository.find({
				where: { receiverId: chatRoomId }, // Removed the array, directly using the object
				select: ['id', 'senderId', 'receiverId', 'senderName', 'content', 'createdAt'],
				relations: ['chatRoom'],
				order: {
					createdAt: 'ASC', // Correct, assuming you have a 'createdAt' field
				},
			});
			return chatRoomHistory;
		} catch (error) {
			// Handle or log the error appropriately
			console.error(`Failed to fetch chat history: ${error.message}`);
			throw new InternalServerErrorException('Failed to fetch chat history');
		}
	}

	async clearChatRoom(roomId: string, userId: string): Promise<void> {
		// Find the chat room by ID
		const chatRoom = await this.getChatRoomById(roomId);

		// Check if the userId is in the list of adminIds for the chat room
		if (chatRoom.adminIds.includes(userId)) {
			// User is an admin, so proceed with clearing the chat messages
			const chats = await this.chatMessageRepository.find({
				where: { receiverId: roomId },
			});
			await this.chatMessageRepository.remove(chats);
		} else {
			// User is not an admin, throw an error or handle accordingly
			throw new UnauthorizedException('User is not authorized to clear the chat room.');
		}
	}

	async deleteChatRoom(roomId: string, userId: string) {
		// First, delete chat messages associated with the chat room
		await this.chatMessageRepository
			.createQueryBuilder()
			.delete()
			.from(ChatMessage)
			.where('chatRoomId = :id', { id: roomId })
			.execute();

		// Then, delete the chat room itself if the user is authorized
		const deleteResult = await this.chatRoomRepository
			.createQueryBuilder()
			.delete()
			.from(ChatRoom)
			.where('id = :id', { id: roomId })
			.andWhere('ownerId = :userId', { userId: userId })
			.execute();

		// If no chat room was deleted, it could be because it was not found or the user is not the owner
		if (deleteResult.affected === 0) {
			const chatRoom = await this.chatRoomRepository.findOne({ where: { id: roomId } });
			if (!chatRoom) {
				throw new NotFoundException('Chat room not found');
			}
			if (chatRoom.ownerId !== userId) {
				throw new ForbiddenException('You do not have permission to delete this chat room');
			}
		}
	}

	async addUserToChatRoom(roomId: string, userToAdd: User): Promise<ChatRoom> {
		const chatRoom = await this.chatRoomRepository.findOne({
			where: { id: roomId },
			relations: ['users'],
		});

		if (!chatRoom) {
			throw new NotFoundException(`Chat room with ID ${roomId} not found.`);
		}

		const isUserAlreadyInRoom = chatRoom.users.some((user) => user.id === userToAdd.id);

		if (isUserAlreadyInRoom) {
			throw new BadRequestException(`User ${userToAdd.name} is already in the chat room.`);
		}

		chatRoom.users.push(userToAdd);
		await this.chatRoomRepository.save(chatRoom);

		return chatRoom;
	}

	async kickUserFromRoom(roomId: string, userId: string) {
		const chatRoom = await this.chatRoomRepository.findOne({
			where: { id: roomId },
			relations: ['users'],
		});

		if (!chatRoom) {
			throw new NotFoundException(`Chat room with ID ${roomId} not found.`);
		}

		chatRoom.users = chatRoom.users.filter((user) => user.id !== userId);
		await this.chatRoomRepository.save(chatRoom);
		return chatRoom;
	}

	async upgradeToAdmin(roomId: string, userId: string): Promise<any> {
		//console.log('roomId: ', roomId);
		//console.log('userId: ', userId);

		const chatRoom = await this.chatRoomRepository.findOne({
			where: { id: roomId },
			relations: ['users'],
		});

		if (!chatRoom) {
			throw new NotFoundException(`Chat room with ID ${roomId} not found.`);
		}
		//console.log('chatRoom: ', chatRoom);

		// Check if the user is already an admin
		if (chatRoom.adminIds.includes(userId)) {
			throw new BadRequestException(`User with ID ${userId} is already an admin.`);
		}
		// Add the user to the admin list
		chatRoom.adminIds.push(userId);
		await this.chatRoomRepository.save(chatRoom);

		return { message: `User with ID ${userId} has been upgraded to admin in room ${roomId}` };
	}

	//########################CHatMessages#############################

	async saveMessage(receiverId: string, senderId: string, content: string) {
		const sender = await this.userService.findProfileById(senderId);
		const now = new Date();
		const message = new ChatMessage();
		message.senderId = senderId;
		(message.senderName = sender.name), (message.receiverId = receiverId);
		message.content = content;
		message.createdAt = now;
		await this.chatMessageRepository.save(message);
		return message;
	}

	async findFriendChat(userId: string, friendId: string): Promise<ChatMessage[]> {
		try {
			const friendChatHistory = await this.chatMessageRepository.find({
				where: [
					{ senderId: userId, receiverId: friendId },
					{ senderId: friendId, receiverId: userId },
				],
				order: {
					createdAt: 'ASC', // Assuming you have a createdAt field to sort by date
				},
			});
			return friendChatHistory;
		} catch (error) {
			// Handle or log the error appropriately
			console.log(`Failed to fetch chat history: ${error.message}`);
			throw new InternalServerErrorException('Failed to fetch chat history');
		}
	}

	async findChatsWithId(userId: string): Promise<ChatMessage[]> {
		const sentMessages = await this.chatMessageRepository.find({
			where: { senderId: userId },
		});
		const receivedMessages = await this.chatMessageRepository.find({
			where: { receiverId: userId },
		});

		// Combine both lists of messages
		const allMessages = [...sentMessages, ...receivedMessages];
		return allMessages;
	}

	async deleteChat(friendId: string, userId: string): Promise<void> {
		// Find the chat that involves both users
		const chats = await this.chatMessageRepository.find({
			where: [
				{ senderId: friendId, receiverId: userId },
				{ senderId: userId, receiverId: friendId },
			],
		});
		await this.chatMessageRepository.remove(chats);
	}

	//########################FrienRequests#############################
	async sendFriendRequest(
		senderId: string,
		recipientId: string,
		content: string,
	): Promise<FriendRequest> {
		const friendRequest = new FriendRequest();
		friendRequest.senderId = senderId;
		friendRequest.recipientId = recipientId;
		friendRequest.messageType = 'friend_request';
		friendRequest.content = content;
		friendRequest.status = 'pending';

		// Save the friend request in the database
		await this.friendrequestRepository.save(friendRequest);

		// Emit an event to the receiver via WebSocket (if you're using real-time features)
		this.server.to(recipientId).emit('new-friend-request', friendRequest);

		return friendRequest;
	}

	async create(friendRequestDto: FriendRequestDto, user): Promise<FriendRequest> {
		const currUser = await this.userService.findProfileByName(user.name);
		if (!currUser) {
			throw new NotFoundException('User not found.');
		}
		const recipientUser = await this.userService.findProfileByName(friendRequestDto.recipient);
		if (!recipientUser) {
			throw new NotFoundException('Recipient user not found.');
		}
		// Check if the currUser is on ignorelist of friend target
		const isInIgnoreListrecip = recipientUser.ignorelist.some(
			(ignoredUser) => ignoredUser.name === currUser.name,
		);
		if (isInIgnoreListrecip) {
			throw new Error('You are on the ignorelist of that user.');
		}
		const isInIgnoreListcurr = currUser.ignorelist.some(
			(ignoredUser) => ignoredUser.name === friendRequestDto.recipient,
		);
		if (isInIgnoreListcurr) {
			throw new Error('You cannot send a friend request to a user in your ignore list.');
		}
		const isAlreadyFriends = currUser.friends.some(
			(friend) => friend.name === friendRequestDto.recipient,
		);
		if (isAlreadyFriends) {
			throw new Error('You are already friends with this user.');
		}

		// Check for existing pending requests between these two users
		const existingRequest = await this.friendrequestRepository.findOne({
			where: [
				{ senderId: user.id, recipientId: recipientUser.id, status: 'pending' },
				{ senderId: recipientUser.id, recipientId: user.id, status: 'pending' },
			],
		});

		// If a pending request exists, throw an error
		if (existingRequest) {
			throw new Error('A pending friend request already exists.');
		}

		// Create and save a new friendRequest
		const recipient_user = await this.userService.findProfileByName(friendRequestDto.recipient);
		const friendRequest = this.friendrequestRepository.create({
			...friendRequestDto,
			senderId: user.id,
			senderName: user.name,
			recipientId: recipient_user.id,
			status: 'pending',
		});
		await this.friendrequestRepository.save(friendRequest);
		return friendRequest;
	}

	async acceptRequest(messageId: string, user: User) {
		//console.log('accept request started!');
		const request = await this.friendrequestRepository.findOne({ where: { id: messageId } });
		//console.log('REQUEST: ', request);
		if (!request) {
			throw new Error('Request not found');
		}
		let friend = await this.userService.findProfileById(request.senderId);
		user = await this.userService.addFriend(user, friend.name);
		friend = await this.userService.addFriend(friend, user.name);
		await this.friendrequestRepository.remove(request);
		return { success: true, message: 'FriendRequest request accepted.' };
	}

	// Method to decline a FriendRequest request
	async declineRequest(messageId: string, user: User) {
		//console.log('Decline request started!');
		const request = await this.friendrequestRepository.findOne({ where: { id: messageId } });
		if (!request) {
			throw new Error('Request not found');
			//return; TODO bfore eval: activate return, delete throw
		}
		await this.friendrequestRepository.remove(request);
	}

	async findAllPending(userId: string): Promise<FriendRequest[]> {
		//console.log('USerid: ', userId);
		return this.friendrequestRepository.find({
			where: [{ recipientId: userId }],
		});
	}

	async findMyRequests(userId: string): Promise<FriendRequest[]> {
		//console.log('USerid: ', userId);
		return this.friendrequestRepository.find({
			where: [{ senderId: userId }],
		});
	}

	async findOne(id: string): Promise<FriendRequest> {
		return this.friendrequestRepository.findOneBy({ id });
	}

	//########################Debug#############################

	async getAllChatRooms(): Promise<ChatRoom[]> {
		return await this.chatRoomRepository.find({
			relations: ['messages', 'users'],
		});
	}

	async getAllRequests(): Promise<FriendRequest[]> {
		return this.friendrequestRepository.find({});
	}

	async findAllChats(): Promise<ChatMessage[]> {
		return this.chatMessageRepository.find({});
	}

	async deleteAllChats(): Promise<void> {
		const allChats = await this.findAllChats();
		await this.chatMessageRepository.remove(allChats);
	}
}
