// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { FriendRequest } from './friendRequest.entity'; // Update with the correct import path
import { UserModule } from 'src/user/user.module';
import { ChatMessage } from './chat.entity';

@Module({
	imports: [
		UserModule,
		TypeOrmModule.forFeature([FriendRequest, ChatMessage]), // Register the Chat entity with TypeORM
	],
	providers: [ChatService], // Provide the ChatService
	controllers: [ChatController], // Include the ChatController if you have one
	exports: [ChatService], // Export ChatService to make it available in other modules
})
export class ChatModule {}
