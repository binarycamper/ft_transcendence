import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FriendRequest } from './friendRequest.entity';
import { Server } from 'socket.io';
import { FriendRequestDto } from './friendRequest.dto';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/user.entity';
import { ChatMessage } from './chat.entity';
import { ChatRoom } from './chatRoom.entity';

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

	async createChatRoom(chatRoomData: ChatRoom) {
		//console.log('chatRoomData: ', chatRoomData);
		const chatRoom = await this.chatRoomRepository.create(chatRoomData);
		chatRoom.ownerId = chatRoomData.ownerId;
		//console.log('Owner id = ', chatRoomData.ownerId);
		return await this.chatRoomRepository.save(chatRoom);
	}

	//########################CHatMessages#############################

	async saveMessage(receiverId: string, senderId: string, content: string) {
		const now = new Date();
		const message = new ChatMessage();
		message.senderId = senderId;
		message.receiverId = receiverId;
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
		return this.chatRoomRepository.find({});
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
