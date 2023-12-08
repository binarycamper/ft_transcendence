import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/SendMessage.dto';
import { ChatHistoryQueryDto } from './dto/ChatHistoryQuery.dto';

@Controller('chat')
export class ChatController {
	constructor(private chatService: ChatService) {}

	@Post('send')
	async sendMessage(@Body() messageDto: SendMessageDto, @Req() req) {
		// Endpoint to send a message
	}

	@Get('history')
	async getChatHistory(@Query() query: ChatHistoryQueryDto, @Req() req) {
		// Endpoint to get chat history
	}

	// Additional endpoints for group chat, if implemented
}
