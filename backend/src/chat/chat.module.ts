import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
// Import your ChatService here if you have one
// import { ChatService } from './chat.service';

@Module({
	controllers: [ChatController],
	// If you have services, add them to the providers array
	// providers: [ChatService],
})
export class ChatModule {}
