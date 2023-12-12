// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Chat } from './chat.entity'; // Update with the correct import path

@Module({
	imports: [
		TypeOrmModule.forFeature([Chat]), // Register the Chat entity with TypeORM
	],
	providers: [ChatService], // Provide the ChatService
	controllers: [ChatController], // Include the ChatController if you have one
	exports: [ChatService], // Export ChatService to make it available in other modules
})
export class ChatModule {}
