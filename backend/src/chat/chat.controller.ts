// src/chat/chat.controller.ts
import {
	Controller,
	Post,
	Body,
	Get,
	UseGuards,
	Req,
	Query,
	HttpStatus,
	Res,
	Delete,
	HttpCode,
	HttpException,
	ForbiddenException,
	BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { FriendRequestDto } from './friendRequest.dto';
import { Response } from 'express';
import { UserService } from 'src/user/user.service';

@Controller('chat')
export class ChatController {
	constructor(
		private readonly chatService: ChatService,
		private userService: UserService,
	) {}

	//########################CHatRooms#############################

	@UseGuards(JwtAuthGuard)
	@Post('chatroom')
	async createChatRoom(@Body() chatRoomData, @Req() req) {
		const userId = req.user.id; // Get the user ID from the request
		const user = await this.userService.findProfileById(userId);

		// Check the number of chat rooms the user already has
		const chatRoomCount = user.chatRooms.length; // Assuming user.chatRooms is an array of chat rooms

		// Define the maximum number of chat rooms allowed
		const MAX_CHATROOMS = 5;

		// If the user already has the maximum number of chat rooms, throw an error
		if (chatRoomCount >= MAX_CHATROOMS) {
			throw new ForbiddenException('You have reached the maximum number of chat rooms.');
		}

		const existingChatRoom = await this.chatService.findChatRoomByName(chatRoomData.name);
		if (existingChatRoom) {
			throw new BadRequestException('Chat room name already in use.');
		}
		// Since the user has not reached the maximum, create the new chat room
		const chatRoom = await this.chatService.createChatRoom(chatRoomData);

		// Add the new chat room to the user's chat rooms
		user.chatRooms.push(chatRoom);

		// Save the updated user entity
		await this.userService.updateUser(user);

		return chatRoom;
	}

	@UseGuards(JwtAuthGuard)
	@Get('mychatrooms')
	async myChatRooms(@Req() req, @Res() res) {
		try {
			const user = await this.userService.findProfileById(req.user.id);
			// Assuming you have a method to get chat rooms for a user
			res.status(HttpStatus.OK).json(user.chatRooms);
		} catch (error) {
			// Handle any errors that occur
			res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ message: 'An error occurred while fetching chat rooms.' });
		}
	}

	@UseGuards(JwtAuthGuard)
	@Get('chatroomhistory')
	async getChatRoomChat(@Req() req, @Query('chatroomid') chatRoomId: string) {
		try {
			const userId = req.user.id;
			const result = await this.chatService.findChatRoomChat(chatRoomId);
			//console.log('res: ', result);
			return result;
		} catch (error) {
			throw new HttpException('Failed to retrieve chat history', HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@Delete('clearchatroom')
	async clearChatRoom(@Query('chatroomId') roomId: string, @Req() req) {
		return await this.chatService.clearChatRoom(roomId, req.user.id);
	}

	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@Delete('deletechatroom')
	async deleteChatRoom(@Query('chatroomId') roomId: string, @Req() req) {
		return await this.chatService.deleteChatRoom(roomId, req.user.id);
	}

	//########################CHatMessages#############################

	@UseGuards(JwtAuthGuard)
	@Get('history')
	async getFriendChat(@Req() req, @Query('friendId') friendId: string) {
		try {
			const userId = req.user.id;
			return await this.chatService.findFriendChat(userId, friendId);
		} catch (error) {
			throw new HttpException('Failed to retrieve chat history', HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@Delete('deletechat')
	async deleteMyChats(@Query('friendId') friendId: string, @Req() req) {
		return await this.chatService.deleteChat(friendId, req.user.id);
	}

	//########################FrienRequests#############################

	// Endpoint to send a friendrequest
	@UseGuards(JwtAuthGuard)
	@Post('friendrequest')
	async create(@Body() createChatDto: FriendRequestDto, @Req() req, @Res() res: Response) {
		//console.log('friendrequest arrived, dto: ', createChatDto);
		if (createChatDto.recipient === req.user.name) {
			res.status(HttpStatus.BAD_REQUEST).json({
				statusCode: HttpStatus.BAD_REQUEST,
				message: 'You cannot send a friend request to yourself.',
			});
		} else {
			try {
				const friendRequest = await this.chatService.create(createChatDto, req.user);
				res.status(HttpStatus.CREATED).json(friendRequest);
			} catch (error) {
				res.status(HttpStatus.BAD_REQUEST).json({
					statusCode: HttpStatus.BAD_REQUEST,
					message: '' + error,
				});
			}
		}
	}

	// Endpoint to get all pending requests for the logged-in user
	@UseGuards(JwtAuthGuard)
	@Get('pendingrequests')
	async findAllPending(@Req() req) {
		return this.chatService.findAllPending(req.user.id);
	}

	@UseGuards(JwtAuthGuard)
	@Get('myrequests')
	async MyRequests(@Req() req) {
		return this.chatService.findMyRequests(req.user.id);
	}

	//accept a friend-request and save the friendships
	@UseGuards(JwtAuthGuard)
	@Post('accept')
	async acceptRequest(@Query('messageid') messageId: string, @Req() req, @Res() res: Response) {
		//console.log(`Accepting request with messageId: ${messageId}`);
		try {
			await this.chatService.acceptRequest(messageId, req.user);
			return res.status(HttpStatus.OK).send('Friend accepted!');
		} catch (error) {
			return res.status(HttpStatus.NOT_FOUND).json({ error: error.message });
		}
	}

	//decline a friend-request && deletes it
	@UseGuards(JwtAuthGuard)
	@Post('decline')
	async declineRequest(@Query('messageid') messageId: string, @Req() req, @Res() res: Response) {
		try {
			await this.chatService.declineRequest(messageId, req.user);
			return res.status(HttpStatus.NO_CONTENT).send('friend request declined!');
		} catch (error) {
			return res.status(HttpStatus.NOT_FOUND).json({ error: error.message });
		}
	}

	//########################Debug#############################	//TODO: delete before eval

	@Get('allchatrooms')
	async getChatRooms() {
		return await this.chatService.getAllChatRooms();
	}

	// Endpoint to get all pending requests for the logged-in user
	@Get('allrequests')
	async getAll() {
		return await this.chatService.getAllRequests();
	}

	@Get('allchats')
	async findAllChats() {
		return await this.chatService.findAllChats();
	}

	@Delete('allchats')
	@HttpCode(HttpStatus.NO_CONTENT)
	async deleteAllChats() {
		return await this.chatService.deleteAllChats();
	}
}
