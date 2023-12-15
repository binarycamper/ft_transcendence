import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FriendRequest } from './friendRequest.entity'; // Adjust the path to your actual Chat entity
import { Server } from 'socket.io';
import { FriendRequestDto } from './friendRequest.dto';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/user.entity';

@Injectable()
export class ChatService {
	private server: Server; // This should be injected or set from outside, probably from your WebSocket gateway

	constructor(
		@InjectRepository(FriendRequest)
		private readonly friendrequestRepository: Repository<FriendRequest>,
		private userService: UserService,
	) {}

	setServer(server: Server) {
		this.server = server;
	}

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

	async create(firendRequestDto: FriendRequestDto, user): Promise<FriendRequest> {
		// Find the recipient user by name
		const recipientUser = await this.userService.findProfileByName(firendRequestDto.recipient);
		if (!recipientUser) {
			throw new Error('Recipient user not found.');
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

		// Create and save a new chat message
		//console.log('createChatDto Body: ', createChatDto);
		const recipient_user = await this.userService.findProfileByName(firendRequestDto.recipient);
		const chat = this.friendrequestRepository.create({
			...firendRequestDto,
			senderId: user.id,
			senderName: user.name,
			recipientId: recipient_user.id,
			status: 'pending',
		});
		await this.friendrequestRepository.save(chat);
		return chat;
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
		return { success: true, message: 'Chat request accepted.' };
	}

	// Method to decline a chat request
	async declineRequest(messageId: string, user: User) {
		//console.log('Decline request started!');
		const request = await this.friendrequestRepository.findOne({ where: { id: messageId } });
		if (!request) {
			throw new Error('Request not found');
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

	//debug
	async getAllRequests(): Promise<FriendRequest[]> {
		return this.friendrequestRepository.find({});
	}
}
