//eventsgateway.ts
import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import * as cookie from 'cookie';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { EventsService } from './events.service';
import { ChatService } from 'src/chat/chat.service';
import { UserService } from 'src/user/user.service';
import { ChatRoom } from 'src/chat/chatRoom.entity';
import { randomUUID } from 'crypto';
import {
	AuthenticatedSocket,
	DecodedToken,
	SendMessageDto,
	SendMessageToChatRoomDto,
	SocketWithUserData,
} from './dto/dto';
import { ChatMessage } from 'src/chat/chat.entity';
import { Mute } from 'src/chat/mute.entity';
import { User } from 'src/user/user.entity';
/* import { instrument } from '@socket.io/admin-ui'; */

@WebSocketGateway({
	cors: {
		origin: `http://${process.env.HOST_IP}:5173`, // Replace with your frontend's origin
		//methods: ['GET', 'POST'], // You can specify the allowed methods
		credentials: true, // Important if you're using credentials like cookies or auth headers
	},
})
export class EventsGateway {
	@WebSocketServer()
	server: Server;

	constructor(
		private chatService: ChatService,
		private jwtService: JwtService,
		private eventsService: EventsService,
		private userService: UserService,
	) {}

	/* afterInit() {
		instrument(this.server, {
			auth: false,
			mode: 'development',
		});
	} */

	// async verifyAuthentication(
	// 	client: SocketWithUserData,
	// ): Promise<{ isAuthenticated: boolean; userId: string }> {
	// 	const cookies = cookie.parse(client.handshake.headers.cookie || '');
	// 	if (!cookies.token) {
	// 		console.log('No cookies provided');
	// 		return { isAuthenticated: false, userId: null };
	// 	}
	// 	const { token } = cookies;
	// 	if (!token) {
	// 		console.log('No token provided');
	// 		return { isAuthenticated: false, userId: null };
	// 	}
	// 	const decoded = this.jwtService.verify<DecodedToken>(token, {
	// 		secret: process.env.JWT_SECRET,
	// 	});

	// 	if (decoded) {
	// 		client.data.user = decoded;
	// 		return { isAuthenticated: true, userId: decoded.id };
	// 	}
	// 	return { isAuthenticated: false, userId: null };
	// }

	verifyAuthentication(client: SocketWithUserData): {
		isAuthenticated: boolean;
		userId: string | null;
	} {
		const cookies = cookie.parse(client.handshake.headers.cookie || '');
		if (!cookies.token) {
			console.log('No cookies provided');
			return { isAuthenticated: false, userId: null };
		}
		const { token } = cookies;
		if (!token) {
			console.log('No token provided');
			return { isAuthenticated: false, userId: null };
		}

		try {
			const decoded = this.jwtService.verify<DecodedToken>(token, {
				secret: process.env.JWT_SECRET,
			});

			if (decoded) {
				client.data.user = decoded;
				return { isAuthenticated: true, userId: decoded.id };
			}
		} catch (error) {
			console.error('Error verifying token:', error);
		}

		return { isAuthenticated: false, userId: null };
	}

	//########################UserStatus#############################

	//old

	// async handleConnection(client: Socket, ...args: any[]) {
	// 	try {
	// 		const isAuthenticated = this.verifyAuthentication(client);
	// 		if (!isAuthenticated.isAuthenticated) {
	// 			console.log('Invalid credentials');
	// 			return;
	// 		}
	// 		// User is authenticated, proceed with connection
	// 		//console.log('Email to track online: ', client.data.user.email);
	// 		await this.eventsService.userConnected(client.data.user.email);
	// 		client.join(`user_${isAuthenticated.userId}`);
	// 	} catch (error) {
	// 		console.error('In handleConnection:', error.message);
	// 	}
	// }

	//test new eslint conform

	async handleConnection(client: AuthenticatedSocket) {
		try {
			const isAuthenticated = this.verifyAuthentication(client);
			if (!isAuthenticated.isAuthenticated) {
				console.log('Invalid credentials');
				client.disconnect();
				return;
			}

			await this.eventsService.userConnected(client.data.user.email);
			await client.join(`user_${isAuthenticated.userId}`);
		} catch (error) {
			if (error instanceof Error) {
				console.log('In handleConnection:', error.message);
			} else {
				console.log('in handleConnection: ');
			}
		}
	}

	async handleDisconnect(client: AuthenticatedSocket) {
		if (client.data.user) {
			await this.eventsService.userDisconnected(client.data.user.email);
		} else {
			console.log('User without account detected');
		}
	}

	//########################ChatMessages#############################

	//TODO: DTO here pls
	@SubscribeMessage('send-message')
	async handleMessage(
		@MessageBody() data: SendMessageDto,
		//@MessageBody() data: { receiverId: string; content: string },
		@ConnectedSocket() client: AuthenticatedSocket,
	) {
		try {
			const isAuthenticated = this.verifyAuthentication(client);
			if (!isAuthenticated.isAuthenticated) {
				console.log('Invalid credentials');
				return;
			}
			//console.log('handleMessage arrived, Chat entry gets created:', data.content);
			const message: ChatMessage = await this.chatService.saveMessage(
				data.receiverId,
				isAuthenticated.userId,
				data.content,
			);
			// Emit the message to the recipient if they're online
			this.server.to(`user_${data.receiverId}`).emit('receive-message', {
				content: message.content,
				senderName: message.senderName,
				senderId: message.senderId,
				receiverId: message.receiverId,
				id: message.id,
			});

			// Emit the message to the sender, update the chat display
			this.server.to(`user_${isAuthenticated.userId}`).emit('receive-message', {
				content: message.content,
				senderId: message.senderId,
				receiverId: message.receiverId,
				id: message.id,
			});
		} catch (error) {
			if (error instanceof Error) {
				console.error('Error in handleMessage:', error.message);
			} else {
				console.error('An unknown error occurred in handleMessage');
			}
		}
	}

	@SubscribeMessage('send-message-to-chatroom')
	async handleMessageToChatRoom(
		@MessageBody() data: SendMessageToChatRoomDto,
		//@MessageBody() data: { chatRoomId: string; content: string },
		@ConnectedSocket() client: AuthenticatedSocket,
	) {
		try {
			const isAuthenticated = this.verifyAuthentication(client);
			if (!isAuthenticated.isAuthenticated) {
				console.log('Invalid credentials');
				return;
			}

			const chatRoom: ChatRoom = await this.chatService.getChatRoomById(data.chatRoomId);
			const isUserMember = chatRoom.users.some((user) => user.id === isAuthenticated.userId);
			if (!isUserMember) {
				// User is not a member of the chat room, handle accordingly
				console.log('User is not a member of the chat room');
				return;
			}

			const mutes: Mute[] = chatRoom.mutes;

			//TODO: if isAuthenticated.userId is member of chatroom (chatRoom.users)

			const activeMute = mutes.find(
				(mute) => mute.userId === isAuthenticated.userId && new Date(mute.endTime) > new Date(),
			);
			if (activeMute) {
				const endTime = new Date(activeMute.endTime);
				const remainingTime: number = endTime.getTime() - new Date().getTime();

				let timeMessage = '';

				const remainingSeconds: number = Math.ceil(remainingTime / 1000); // convert to seconds
				const remainingMinutes: number = Math.ceil(remainingTime / (1000 * 60)); // convert to minutes

				// If the remaining time is less than 5 minutes, display in seconds
				if (remainingSeconds <= 5 * 60) {
					timeMessage = `${remainingSeconds} second(s)`;
				} else {
					// Otherwise, display in minutes
					timeMessage = `${remainingMinutes} minute(s)`;
				}
				// Emit a message to the user informing them they are muted with the remaining time
				this.server.to(`user_${isAuthenticated.userId}`).emit('receive-message', {
					content: `You are currently muted and cannot send messages. Time left: ${timeMessage}.`,
					senderId: isAuthenticated.userId,
					senderName: 'System',
					receiverId: chatRoom.id,
					id: randomUUID(),
				});
				return;
			}
			// Check if there are any expired mutes and delete them.
			const expiredMutes: Mute[] = mutes.filter((mute) => new Date(mute.endTime) <= new Date());
			for (const expiredMute of expiredMutes) {
				await this.chatService.deleteMute(expiredMute.id);
			}

			//console.log('handleMessage arrived, Chat entry gets created:', data.content);
			const message: ChatMessage = await this.chatService.saveChatRoomMessage(
				data.chatRoomId,
				isAuthenticated.userId,
				data.content,
			);
			//console.log('the new message is: ', message);

			// Emit the message to all ChatROomUsers if they're online
			//console.log('chatroom users: ', chatRoom.users);
			const currUser: User = await this.userService.findProfileById(isAuthenticated.userId);
			for (const user of chatRoom.users) {
				const recipient: User = await this.userService.findProfileById(user.id);
				if (recipient.blocklist.some((blockedUser) => blockedUser.id === currUser.id)) {
					//console.log('User is blocked!');
					// If the sender is on the recipient's blocklist, censor the message
					this.server.to(`user_${user.id}`).emit('receive-message', {
						content: '[Message Hidden]',
						senderId: message.senderId,
						senderName: 'Blocked User',
						receiverId: message.receiverId,
						id: message.id,
					});
				} else {
					// Emit the message to each user's individual socket room
					this.server.to(`user_${user.id}`).emit('receive-message', {
						content: message.content,
						senderId: message.senderId,
						senderName: message.senderName,
						receiverId: message.receiverId,
						id: message.id,
					});
				}
			}
		} catch (error) {
			if (error instanceof Error) {
				console.log('Error in handleMessage:', error.message);
			} else {
				console.log('An unknown error occurred in handleMessage');
			}
		}
	}
}
