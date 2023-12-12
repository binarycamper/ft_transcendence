// src/chat/chat.controller.ts
import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateChatDto } from './create.chat.dto'; // DTO for creating a chat message

@Controller('chat')
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	// Endpoint to send a chat message or friend request
	@UseGuards(JwtAuthGuard)
	@Post('friendrequest')
	async create(@Body() createChatDto: CreateChatDto, @Req() req) {
		console.log('friendrequest arrived');
		return this.chatService.create(createChatDto, req.user);
	}

	// Endpoint to get all chat messages for the logged-in user
	@UseGuards(JwtAuthGuard)
	@Get()
	async findAll(@Req() req) {
		//return this.chatService.findAll(req.user.id);
	}

	// Endpoint to get a specific chat message
	@UseGuards(JwtAuthGuard)
	@Get(':id')
	async findOne(@Param('id') id: string) {
		//return this.chatService.findOne(id);
	}
}
