import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from './chat.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChatService {
	constructor(
		@InjectRepository(ChatMessage)
		private chatMessageRepository: Repository<ChatMessage>,
	) // Other injections (e.g., UserRepository)
	{}

	async sendMessage(senderId: string, receiverId: string, content: string) {
		// Create and save the chat message
	}

	async getChatHistory(userId: string, otherUserId: string) {
		// Retrieve chat history between two users
	}

	// Additional methods for group chat functionality, if implemented
}
