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
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { FriendRequestDto } from './friendRequest.dto';
import { Response } from 'express';
import { UserService } from 'src/user/user.service';

@Controller('chat')
export class ChatController {
	constructor(private readonly chatService: ChatService, private userService: UserService) {}

	//########################CHatRooms#############################

	@UseGuards(JwtAuthGuard)
	@Post('chatroom')
	async createChatRoom(@Body() chatRoomData, @Req() req) {
		// chatRoomData now contains the parsed JSON object sent in the request body
		console.log(chatRoomData); // This will log the chat room data sent from the frontend

		// You can access individual properties like this:
		//const roomName = chatRoomData.name;
		//const creatorId = chatRoomData.creator;
		//const type = chatRoomData.type;
		//const pw = chatRoomData.password;

		// Perform your logic here, for example, calling a service method to handle the chat room creation
		const user = await this.userService.findProfileById(req.user.id);
		//console.log('User: ', user);
		const result = await this.chatService.createChatRoom(chatRoomData);
		console.log('res: ', result);
		// Return a response, for example, the created chat room object or a success message
		// return result;
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
	@Delete('deleteChat')
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
