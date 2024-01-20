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
	NotFoundException,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { Request, Response } from 'express';
import { UserService } from 'src/user/user.service';
import {
	AcceptRequestDto,
	ChangePasswordDto,
	ClearChatRoomDto,
	CreateChatRoomDto,
	FriendRequestDto,
	GetFriendChatDto,
	InviteRoomDto,
	MuteUserDto,
	RoomIdUserIdDTO,
	UnMuteUserDto,
} from './dto/chatRoom.dto';
import * as bcrypt from 'bcryptjs';
import { StatusGuard } from 'src/auth/guards/status.guard';
import { User } from 'src/user/user.entity';
import { ChatRoom } from './chatRoom.entity';
import { ChatMessage } from './chat.entity';
import { FriendRequest } from './friendRequest.entity';

@Controller('chat')
export class ChatController {
	constructor(
		private readonly chatService: ChatService,
		private userService: UserService,
	) {}

	//########################Mute#############################

	@UseGuards(JwtAuthGuard)
	@Post('mute')
	async muteChatRoomUser(@Body() muteUserData: MuteUserDto) {
		try {
			await this.chatService.muteUser(muteUserData);
		} catch (error) {
			console.log('Error muting user:', error);
			throw new HttpException('Failed to mute user.', HttpStatus.BAD_REQUEST);
		}
	}

	@UseGuards(JwtAuthGuard)
	@Post('unmute')
	async unmuteChatRoomUser(@Body() unMuteUserData: UnMuteUserDto) {
		try {
			await this.chatService.unmuteUser(unMuteUserData);
		} catch (error) {
			console.log('Error muting user:', error);
			throw new HttpException('Failed to mute user.', HttpStatus.BAD_REQUEST);
		}
	}

	//########################CHatRooms#############################

	//TODO: avoid getting private rooms here!
	@UseGuards(JwtAuthGuard)
	@Get('all-chatrooms')
	async getChatRooms() {
		return await this.chatService.getAllChatRooms();
	}

	//create a new Chatroom
	@UseGuards(JwtAuthGuard, StatusGuard)
	@Post('chatroom')
	async createChatRoom(@Body() chatRoomData: CreateChatRoomDto, @Req() req: Request) {
		try {
			const user: User = await this.userService.findProfileById(req.user.id);
			// Check the number of chat rooms the user already has
			const chatRoomCount: number = user.chatRooms.length; // Assuming user.chatRooms is an array of chat rooms
			const MAX_CHATROOMS = 5;
			// If the user already has the maximum number of chat rooms, throw an error
			if (chatRoomCount >= MAX_CHATROOMS) {
				throw new ForbiddenException(
					'You have reached the maximum number of chat rooms. You can still join other rooms in the ChatRoomlist',
				);
			}

			const existingChatRoom: ChatRoom = await this.chatService.findChatRoomByName(
				chatRoomData.name,
			);
			if (existingChatRoom) {
				throw new BadRequestException('Chat room name already in use.');
			}

			// Since the user has not reached the maximum, create the new chat room
			chatRoomData.ownerName = user.name;
			const chatRoom = await this.chatService.createChatRoom(chatRoomData);

			// Add the new chat room to the user's chat rooms
			user.chatRooms.push(chatRoom);

			if (!user.achievements.includes('Room Architect 🏗️')) {
				// Push the 'ChatCreator' achievement only if it's not already there
				user.achievements.push('Room Architect 🏗️');
			}

			// Save the updated user entity
			await this.userService.updateUser(user);

			return chatRoom;
		} catch (error) {
			// Here, handle specific types of errors as needed
			if (error instanceof ForbiddenException) {
				// Specific handling for ForbiddenException
				throw new HttpException(error.message, HttpStatus.FORBIDDEN);
			} else if (error instanceof BadRequestException) {
				// Specific handling for BadRequestException
				throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
			}
			// For other types of errors
			//console.error('Failed to create chat room:', error);
			throw new HttpException(
				'Internal Server Error: Failed to create chat room due to an unexpected error',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	//get all Chatrooms of that user
	@Get('my-chatrooms')
	@UseGuards(JwtAuthGuard, StatusGuard)
	async myChatRooms(@Req() req: Request, @Res() res: Response) {
		try {
			const user: User = await this.userService.findProfileById(req.user.id);
			res.status(HttpStatus.OK).json(user.chatRooms);
		} catch (error) {
			// Handle any errors that occur
			res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ message: 'An error occurred while fetching chat rooms.' });
		}
	}

	//delivers the Chathistory of a chatroom.
	@Get('chatroom-history')
	@UseGuards(JwtAuthGuard)
	async getChatRoomChat(@Req() req: Request, @Query() clearChatRoomDto: ClearChatRoomDto) {
		try {
			const user: User = await this.userService.findProfileById(req.user.id);
			const chatRoom: ChatRoom = await this.chatService.getChatRoomById(
				clearChatRoomDto.chatroomId,
			);

			// Ensure the user is a member of the chat room
			if (!chatRoom.users.some((u) => u.id === req.user.id)) {
				throw new ForbiddenException('User is not a member of this chat room.');
			}

			const chatHistory: ChatMessage[] = await this.chatService.findChatRoomChat(
				clearChatRoomDto.chatroomId,
			);

			// Censor messages from blocked users
			const censoredHistory = chatHistory.map((message) => {
				if (user.blocklist.some((blockedUser) => blockedUser.id === message.senderId)) {
					return { ...message, content: '[Message Hidden]', senderName: '[Blocked User]' };
				}
				return message;
			});

			return censoredHistory;
		} catch (error) {
			throw new HttpException('Failed to retrieve chat history', HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	//clears Chathistory in the Chatroom.
	@Delete('clear-chatroom')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	async clearChatRoom(@Query() clearChatRoomDto: ClearChatRoomDto, @Req() req: Request) {
		return await this.chatService.clearChatRoom(clearChatRoomDto.chatroomId, req.user.id);
	}

	//delete your ChatROom (only owner)
	@Delete('delete-chatroom')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	async deleteChatRoom(@Query() clearChatRoomDto: ClearChatRoomDto, @Req() req: Request) {
		try {
			await this.chatService.deleteChatRoom(clearChatRoomDto.chatroomId, req.user.id);
		} catch (error) {
			// If the chatroom exists but the user is not the owner: Forbidden exception
			if (error instanceof HttpException) {
				throw new ForbiddenException('User is not the owner of the chat room.');
			}
			// Re-throw the error if it's not a NotOwnerException
			throw error;
		}
	}

	//adds a player to a chatroom.
	@Post('invite-to-room')
	@UseGuards(JwtAuthGuard)
	async inviteToRoom(
		@Body() inviteRoomDto: InviteRoomDto,
		@Req() req: Request,
	): Promise<{ message: string }> {
		const { roomId, userNameToInvite } = inviteRoomDto;
		//console.log('roomId: ', roomId);
		//console.log('userNameToInvite: ', userNameToInvite);
		try {
			const chatRoom: ChatRoom = await this.chatService.getChatRoomById(roomId);
			if (!chatRoom) {
				throw new NotFoundException('Chat room not found.');
			}
			//console.log('User count: ', chatRoom.users.length);
			//limit users in chatroom
			if (chatRoom.users.length >= 10) {
				throw new BadRequestException('Chat room has max users');
			}

			//console.log('OwnerId: ', chatRoom.ownerId);
			//console.log('userID: ', req.user.id);
			if (!chatRoom.adminIds.includes(req.user.id)) {
				throw new UnauthorizedException('No permissions to invite users!');
			}

			//check if Username is a existing user
			const userToInvite: User = await this.userService.findProfileByName(userNameToInvite);
			if (!userToInvite) {
				throw new NotFoundException('The user you are trying to invite does not exist.');
			}

			//check if user is already in Chatroom
			if (chatRoom.users.some((user) => user.name === userNameToInvite)) {
				throw new BadRequestException(
					'The user you are trying to invite is already in the chat room.',
				);
			}
			// TODO: Add request system here like the friendrequest does, or similiar...
			await this.chatService.addUserToChatRoom(roomId, userToInvite);
			const user: User = await this.userService.findProfileById(req.user.id);
			if (!user.achievements.includes('Social Butterfly 🦋')) {
				user.achievements.push('Social Butterfly 🦋');
				await this.userService.updateUser(user);
			}
			// Return a success response if the invitation was sent
			return { message: 'Invitation sent successfully.' };
		} catch (error) {
			//console.error('Error inviting to room:', error);

			// Rethrow the error if it's a known HTTP exception
			if (error instanceof HttpException) {
				throw error;
			}

			// For other types of errors, throw an InternalServerErrorException
			throw new InternalServerErrorException(
				'An unexpected error occurred while inviting the user to the room.',
			);
		}
	}

	//join a public chatroom + pw if set
	@Post('join-room')
	@UseGuards(JwtAuthGuard)
	async joinChatRoom(
		@Req() req: Request,
		@Body() inviteRoomDto: InviteRoomDto,
	): Promise<{ message: string }> {
		const userId: string = req.user.id;
		const { roomId } = inviteRoomDto;
		// Get the chat room details
		const chatRoom: ChatRoom = await this.chatService.getChatRoomById(roomId);
		if (!chatRoom) {
			throw new NotFoundException('Chat room not found.');
		}

		/*if (chatRoom.ownerName === req.user.name) {
			throw new UnauthorizedException('You are already the owner of that Chatroom!');
		}*/

		if (chatRoom.type === 'private') {
			throw new UnauthorizedException('ChatRoom is private, you will need an invite.');
		}
		//console.log('chatroom pw_len :', chatRoom.password.length);

		if (chatRoom.type === 'public' && chatRoom.password !== '') {
			const isPasswordMatch: boolean = await bcrypt.compare(
				inviteRoomDto.password,
				chatRoom.password,
			);
			if (!isPasswordMatch) {
				throw new UnauthorizedException('Incorrect password.');
			}
		}
		// Check if the user is already in the chat room
		if (chatRoom.users.some((user) => user.id === userId)) {
			throw new BadRequestException('You are already a member of this room.');
		}

		if (chatRoom.users.length >= 10) {
			throw new BadRequestException('Chat room has max users');
		}
		// Check if the chat room is private and if the user is an admin or invited
		if (
			!chatRoom.adminIds.includes(userId) &&
			!chatRoom.users.some((user) => user.id === userId) &&
			chatRoom.type === 'private'
		) {
			throw new ForbiddenException('You do not have permission to join this room.');
		}

		// Add the user to the room
		try {
			const userToAdd: User = await this.userService.findProfileById(userId);
			if (!userToAdd.achievements.includes('ChatRoom Lurker 👀')) {
				userToAdd.achievements.push('ChatRoom Lurker 👀');
			}
			await this.userService.updateUser(userToAdd);

			// Add the user to the room
			await this.chatService.addUserToChatRoom(roomId, userToAdd);
			return { message: 'Joined the room successfully.' };
		} catch (error) {
			// Log the error and throw an appropriate exception
			console.error('Error while adding user to chat room:', error);
			throw new InternalServerErrorException('An error occurred while joining the room.');
		}
	}

	//kick a user in a chatroom, if you are owner. //TODO: kick as admin normal members.
	@Post('kick-user')
	@UseGuards(JwtAuthGuard)
	async kickUser(@Body() kickUserDto: RoomIdUserIdDTO, @Req() req: Request) {
		try {
			await this.chatService.kickUserFromRoom(kickUserDto.roomId, kickUserDto.userId, req.user.id);
			const user: User = await this.userService.findProfileById(req.user.id);
			if (!user.achievements.includes('Peacekeeper 🛡️')) {
				user.achievements.push('Peacekeeper 🛡️');
				await this.userService.updateUser(user);
			}
			return { message: 'User successfully kicked' };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw new HttpException(error.message, HttpStatus.NOT_FOUND);
			} else if (error instanceof UnauthorizedException) {
				throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
			} else {
				// Log the error for debugging
				//console.log('Failed to kick user:', error);
				throw new HttpException(
					'Failed to kick user due to an unexpected error',
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}
		}
	}

	@Post('upgrade-to-admin')
	@UseGuards(JwtAuthGuard)
	async upgradeToAdmin(@Body() roomIdUserIdDto: RoomIdUserIdDTO, @Req() req: Request) {
		try {
			await this.chatService.upgradeToAdmin(
				roomIdUserIdDto.roomId,
				roomIdUserIdDto.userId,
				req.user.id,
			);
			return { message: 'User successfully upgraded to admin' };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw new HttpException(`Chat room not found: ${error.message}`, HttpStatus.NOT_FOUND);
			} else if (error instanceof UnauthorizedException) {
				throw new HttpException(`Unauthorized: ${error.message}`, HttpStatus.UNAUTHORIZED);
			} else if (error instanceof BadRequestException) {
				throw new HttpException(`Bad request: ${error.message}`, HttpStatus.BAD_REQUEST);
			}
			// Log the error for internal monitoring
			//console.error('Internal Server Error:', error);

			throw new HttpException(
				'Internal Server Error: Failed to upgrade user due to an unexpected error',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	@Post('revoke-admin')
	@UseGuards(JwtAuthGuard)
	async revokeAdmin(@Body() roomIdUserIdDto: RoomIdUserIdDTO, @Req() req: Request) {
		try {
			const chatRoom: ChatRoom = await this.chatService.getChatRoomById(roomIdUserIdDto.roomId);
			if (!chatRoom) {
				throw new NotFoundException(`Chat room with ID ${roomIdUserIdDto.roomId} not found.`);
			}

			// Check if the requesting user is the owner of the chat room
			if (chatRoom.ownerId !== req.user.id) {
				throw new ForbiddenException('Only the owner can revoke admin rights.');
			}

			// Check if the user is actually an admin of the chat room
			if (!chatRoom.adminIds.includes(roomIdUserIdDto.userId)) {
				throw new BadRequestException(`User is not an admin.`);
			}

			// Prevent the owner from revoking their own admin status
			if (chatRoom.ownerId === roomIdUserIdDto.userId) {
				throw new ForbiddenException('You cannot revoke your admin status as owner!');
			}

			chatRoom.adminIds = chatRoom.adminIds.filter((adminId) => adminId !== roomIdUserIdDto.userId);
			await this.chatService.updateChatRoom(chatRoom);
			return { message: `Admin rights revoked from user.` };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw new HttpException(error.message, HttpStatus.NOT_FOUND);
			} else if (error instanceof ForbiddenException) {
				throw new HttpException(error.message, HttpStatus.FORBIDDEN);
			} else if (error instanceof BadRequestException) {
				throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
			} else {
				// Log the error for internal monitoring
				//console.error('Error in revoking admin:', error);
				throw new InternalServerErrorException(
					'Internal Server Error: Failed to revoke admin rights.',
				);
			}
		}
	}

	//change ChatROom password as owner
	@Post('change-password')
	@UseGuards(JwtAuthGuard)
	async changePassword(@Req() req: Request, @Body() changePasswordDto: ChangePasswordDto) {
		const userId: string = req.user.id;
		const { roomId, oldPassword, newPassword } = changePasswordDto;

		//TODO: Write seperate function to get Room credits and exclude pw in getChatRoomById
		const chatRoom: ChatRoom = await this.chatService.getChatRoomById(roomId);
		if (!chatRoom) {
			throw new NotFoundException('Chat room not found.');
		}

		// Ensure the requesting user is the owner of the chat room
		if (chatRoom.ownerId !== userId) {
			throw new ForbiddenException('Only the owner can change the password of the chat room.');
		}
		//console.log('old: ', chatRoom.password);
		// Check if the old password matches
		if (chatRoom.password.length > 1) {
			const isMatch = chatRoom.password
				? await bcrypt.compare(oldPassword, chatRoom.password)
				: false;
			if (!isMatch) {
				throw new BadRequestException('Old password does not match.');
			}
		}

		// Update the password or remove it
		if (newPassword === '') {
			chatRoom.password = '';
		} else {
			const hashedPassword: string = await bcrypt.hash(newPassword, 10);
			chatRoom.password = hashedPassword;
		}
		await this.chatService.updateChatRoom(chatRoom);
		return { message: 'Password has been updated successfully.' };
	}

	//########################CHatMessages#############################

	//delivers chathistory between two friends, or between chatroom and memebers.
	@Get('history')
	@UseGuards(JwtAuthGuard)
	async getFriendChat(@Req() req: Request, @Query() getFriendChatDto: GetFriendChatDto) {
		try {
			return await this.chatService.findFriendChat(req.user.id, getFriendChatDto.friendId);
		} catch (error) {
			throw new HttpException('Failed to retrieve chat history', HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	//deletes chat between two friends.
	@Delete('delete-chat')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	async deleteMyChats(@Query() getFriendChatDto: GetFriendChatDto, @Req() req: Request) {
		return await this.chatService.deleteChat(getFriendChatDto.friendId, req.user.id);
	}

	//########################FrienRequests#############################

	// Endpoint to send a friendrequest
	@Post('friend-request')
	@UseGuards(JwtAuthGuard)
	async create(@Body() createChatDto: FriendRequestDto, @Req() req: Request, @Res() res: Response) {
		//console.log('friendrequest arrived, dto: ', createChatDto);

		if (createChatDto.recipient === req.user.name) {
			res.status(HttpStatus.BAD_REQUEST).json({
				statusCode: HttpStatus.BAD_REQUEST,
				message: 'You cannot send a friend request to yourself.',
			});
		} else {
			try {
				const user: User = await this.userService.findProfileById(req.user.id);
				const friendRequest: FriendRequest = await this.chatService.create(createChatDto, user);
				res.status(HttpStatus.CREATED).json(friendRequest);
			} catch (error) {
				res.status(HttpStatus.BAD_REQUEST).json({
					statusCode: HttpStatus.BAD_REQUEST,
					message: `${error}`,
				});
			}
		}
	}

	// Endpoint to get all pending requests for the logged-in user
	@Get('pending-requests')
	@UseGuards(JwtAuthGuard)
	async findAllPending(@Req() req: Request) {
		return this.chatService.findAllPending(req.user.id);
	}

	@Get('my-requests')
	@UseGuards(JwtAuthGuard)
	async MyRequests(@Req() req: Request) {
		return this.chatService.findMyRequests(req.user.id);
	}

	//accept a friend-request and save the friendships
	@Post('accept')
	@UseGuards(JwtAuthGuard)
	async acceptRequest(
		@Query('messageid') messageId: string,
		@Req() req: Request,
		@Res() res: Response,
	) {
		//console.log(`Accepting request with messageId: ${messageId}`);
		try {
			const user: User = await this.userService.findProfileById(req.user.id);
			await this.chatService.acceptRequest(messageId, user);
			return res.status(HttpStatus.OK).send('Friend accepted!');
		} catch (error) {
			if (error instanceof Error) {
				return res.status(HttpStatus.NOT_FOUND).json({ error: error.message });
			}
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ error: 'An unknown error occurred' });
		}
	}

	//decline a friend-request && deletes it
	@Post('decline')
	@UseGuards(JwtAuthGuard)
	async declineRequest(@Query() acceptRequestdto: AcceptRequestDto, @Res() res: Response) {
		try {
			await this.chatService.declineRequest(acceptRequestdto.messageid);
			return res.status(HttpStatus.NO_CONTENT).send('friend request declined!');
		} catch (error) {
			if (error instanceof Error) {
				return res.status(HttpStatus.NOT_FOUND).json({ error: error.message });
			}
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ error: 'An unknown error occurred' });
		}
	}

	//DO NOT USE IN FRONTEND CODE!
	//#####################################################Debug##########################################################	//TODO: delete before eval

	// Endpoint to get all pending Mutes
	@Get('all-mutes')
	async getMutes() {
		return await this.chatService.getAllMutes();
	}

	@Delete('all-mutes')
	@HttpCode(HttpStatus.NO_CONTENT)
	async deleteAllMutes() {
		return await this.chatService.deleteAllMutes();
	}

	// Endpoint to get all pending requests
	@Get('all-requests')
	async getAll() {
		return await this.chatService.getAllRequests();
	}

	@Get('all-chats')
	async findAllChats() {
		return await this.chatService.findAllChats();
	}

	@Delete('all-chats')
	@HttpCode(HttpStatus.NO_CONTENT)
	async deleteAllChats() {
		return await this.chatService.deleteAllChats();
	}
}
