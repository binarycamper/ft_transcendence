import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './chat.entity'; // Adjust the path to your actual Chat entity
import { Server } from 'socket.io';
import { CreateChatDto } from './create.chat.dto';

@Injectable()
export class ChatService {
	private server: Server; // This should be injected or set from outside, probably from your WebSocket gateway

	constructor(
		@InjectRepository(Chat)
		private readonly chatRepository: Repository<Chat>,
	) {}

	setServer(server: Server) {
		this.server = server;
	}

	async sendFriendRequest(senderId: string, receiverId: string, content: string): Promise<Chat> {
		const friendRequest = new Chat();
		friendRequest.senderId = senderId;
		friendRequest.receiverId = receiverId;
		friendRequest.messageType = 'friend_request';
		friendRequest.content = content;
		friendRequest.status = 'pending';

		// Save the friend request in the database
		await this.chatRepository.save(friendRequest);

		// Emit an event to the receiver via WebSocket (if you're using real-time features)
		this.server.to(receiverId).emit('new-friend-request', friendRequest);

		return friendRequest;
	}

	async create(createChatDto: CreateChatDto, user): Promise<Chat> {
		// Create and save a new chat message
		const chat = this.chatRepository.create({
			...createChatDto,
			senderId: user.id, // Set the sender ID to the logged-in user's ID
		});
		await this.chatRepository.save(chat);
		return chat;
	}

	async findAll(userId: string): Promise<Chat[]> {
		// Retrieve all chat messages for the user
		return this.chatRepository.find({
			where: [{ senderId: userId }, { receiverId: userId }],
		});
	}

	async findOne(id: string): Promise<Chat> {
		// Retrieve a specific chat message by ID
		return this.chatRepository.findOneBy({ id });
	}

	// ... other chat service methods ...
}
