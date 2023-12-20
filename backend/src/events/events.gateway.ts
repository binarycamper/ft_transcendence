import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import * as cookie from 'cookie';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { EventsService } from './events.service';
import { ChatService } from 'src/chat/chat.service';
@WebSocketGateway({
	cors: {
		origin: 'http://localhost:5173', // Replace with your frontend's origin
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
		private eventsService: EventsService, //private chatService: ChatService, // Inject your ChatService here
	) {}

	//Provides the User id and checks cookie
	async verifyAuthentication(
		client: Socket,
	): Promise<{ isAuthenticated: boolean; userId: string }> {
		const cookies = cookie.parse(client.handshake.headers.cookie || '');
		if (!cookies.token) {
			console.log('No cookies provided');
			return { isAuthenticated: false, userId: null };
		}
		const token = cookies['token'];
		if (!token) {
			console.log('No token provided');
			return { isAuthenticated: false, userId: null };
		}
		const decoded = await this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
		if (decoded) {
			client.data.user = decoded;
			return { isAuthenticated: true, userId: decoded.id };
		}
		return { isAuthenticated: false, userId: '' };
	}

	async handleConnection(client: Socket, ...args: any[]) {
		try {
			const isAuthenticated = await this.verifyAuthentication(client);
			if (!isAuthenticated.isAuthenticated) {
				console.log('Invalid credentials');
				return;
			}
			// User is authenticated, proceed with connection
			//console.log('Email to track online: ', client.data.user.email);
			await this.eventsService.userConnected(client.data.user.email);
			client.join(`user_${isAuthenticated.userId}`);
		} catch (error) {
			console.error('In handleConnection:', error.message);
		}
	}

	async handleDisconnect(client: any) {
		if (client.data.user) {
			await this.eventsService.userDisconnected(client.data.user.email);
		} else {
			console.log('User without account detected');
		}
	}

	@SubscribeMessage('sendMessage')
	async handleMessage(
		@MessageBody() data: { receiverId: string; content: string },
		@ConnectedSocket() client: Socket,
	) {
		try {
			const isAuthenticated = await this.verifyAuthentication(client);
			if (!isAuthenticated.isAuthenticated) {
				console.log('Invalid credentials');
				return;
			}
			//console.log('handleMessage arrived, Chat entry gets created:', data.content);
			const message = await this.chatService.saveMessage(
				data.receiverId,
				isAuthenticated.userId,
				data.content,
			);
			// Emit the message to the recipient if they're online
			this.server.to(`user_${data.receiverId}`).emit('receiveMessage', {
				content: message.content,
				senderId: message.senderId,
				receiverId: message.receiverId,
				id: message.id,
			});

			// Emit the message to the sender, update the chat display
			this.server.to(`user_${isAuthenticated.userId}`).emit('receiveMessage', {
				content: message.content,
				senderId: message.senderId,
				receiverId: message.receiverId,
				id: message.id,
			});
		} catch (error) {
			console.error('Error in handleMessage:', error.message);
		}
	}
}
