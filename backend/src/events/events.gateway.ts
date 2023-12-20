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
import { Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

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
	): Promise<{ isAuthenticated: boolean; userId: number }> {
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

		return { isAuthenticated: false, userId: null };
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
		} catch (error) {
			console.error('Error in handleConnection:', error.message);
		}
	}

	handleDisconnect(client: any) {
		if (client.data.user) {
			this.eventsService.userDisconnected(client.data.user.email);
		} else {
			console.log('User without account detected');
		}
	}

	/*@UseGuards(JwtAuthGuard)
	@SubscribeMessage('sendMessage')
	async handleMessage(
		@MessageBody() data: { senderId: number; receiverId: number; content: string },
		@ConnectedSocket() client: Socket,
	) {
		const content = data.content;
		const receiverId = data.receiverId;
		const senderId = data.senderId;

		console.log('handleMessage arrived: ', content);
		console.log('receiverId: ', receiverId);
		console.log('senderId: ', senderId);
		// Save the message to the database
		const message = await this.chatService.saveMessage(
			data.senderId,
			data.receiverId,
			data.content,
		);

		// Emit the message to the recipient if they're online
		client.to(`user_${data.receiverId}`).emit('receiveMessage', {
			receiverId: message.receiverId,
			content: message.content,
		});}*/

	@SubscribeMessage('sendMessage')
	async handleMessage(
		@MessageBody()
		data: { receiverId: string; content: string },
		@ConnectedSocket() client: Socket,
	) {
		//console.log('client : ', client);
		try {
			const isAuthenticated = await this.verifyAuthentication(client);
			if (!isAuthenticated.isAuthenticated) {
				console.log('Invalid credentials');
				return;
			}
			//console.log('handleMessage arrived: ', data.content);
			//console.log('receiverId: ', data.receiverId);
			//console.log('senderId: ', isAuthenticated.userId);
			const message = await this.chatService.saveMessage(
				data.receiverId,
				isAuthenticated.userId.toString(),
				data.content,
			);
		} catch (error) {
			console.error('Error in handleMessage:', error.message);
		}
	}
}
