import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './chat.entity'; // Adjust the path to your actual Chat entity
import { Server } from 'socket.io';
import { CreateChatDto } from './create.chat.dto';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/user.entity';

@Injectable()
export class ChatService {
	private server: Server; // This should be injected or set from outside, probably from your WebSocket gateway

	constructor(
		@InjectRepository(Chat)
		private readonly chatRepository: Repository<Chat>,
		private userService: UserService,
	) {}

	setServer(server: Server) {
		this.server = server;
	}

	async sendFriendRequest(senderId: string, recipientId: string, content: string): Promise<Chat> {
		const friendRequest = new Chat();
		friendRequest.senderId = senderId;
		friendRequest.recipientId = recipientId;
		friendRequest.messageType = 'friend_request';
		friendRequest.content = content;
		friendRequest.status = 'pending';

		// Save the friend request in the database
		await this.chatRepository.save(friendRequest);

		// Emit an event to the receiver via WebSocket (if you're using real-time features)
		this.server.to(recipientId).emit('new-friend-request', friendRequest);

		return friendRequest;
	}

	async create(createChatDto: CreateChatDto, user): Promise<Chat> {
		// Create and save a new chat message
		//console.log('createChatDto Body: ', createChatDto);
		const recipient_user = await this.userService.findProfileByName(createChatDto.recipient);
		const chat = this.chatRepository.create({
			...createChatDto,
			recipientId: recipient_user.id,
			senderId: user.id,
			status: 'pending',
		});
		await this.chatRepository.save(chat);
		return chat;
	}

	async acceptRequest(messageId: string, user: User) {
		console.log('accept request started!');
		const request = await this.chatRepository.findOne({ where: { id: messageId } });
		console.log('REQUEST: ', request);
		if (!request) {
			throw new Error('Request not found');
		}
		request.status = 'accepted';
		await this.chatRepository.save(request);

		// Return some confirmation or the updated request
		return { success: true, message: 'Chat request accepted.' };
	}

	// Method to decline a chat request
	async declineRequest(messageId: string, user: User) {
		console.log('Decline request started!');
		const request = await this.chatRepository.findOne({ where: { id: messageId } });
		if (!request) {
			throw new Error('Request not found');
		}
		await this.chatRepository.remove(request);
	}

	async findAll(userId: string): Promise<Chat[]> {
		console.log('USerid: ', userId);
		return this.chatRepository.find({
			where: [{ recipientId: userId }],
		});
	}

	async findOne(id: string): Promise<Chat> {
		return this.chatRepository.findOneBy({ id });
	}

	//debug
	async getAllRequests(): Promise<Chat[]> {
		return this.chatRepository.find({});
	}
}
