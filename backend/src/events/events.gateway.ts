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
import { MatchmakingService } from 'src/matchmaking/matchmaking.service';
import { Match } from '../matchmaking/matchmaking.entity';
import { UserService } from 'src/user/user.service';
import { ChatRoom } from 'src/chat/chatRoom.entity';
import { Mute } from 'src/chat/mute.entity';

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
		private matchmakingService: MatchmakingService,
		private userService: UserService,
	) {}

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

	async handleDisconnect(client: Socket) {
		if (client.data.user) {
			await this.eventsService.userDisconnected(client.data.user.email);
		} else {
			console.log('User without account detected');
		}
	}

	//TODO: DTO here pls
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
				senderName: message.senderName,
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

	@SubscribeMessage('joinQueue')
	async joinQueue(@ConnectedSocket() client: Socket) {
		try {
			const isAuthenticated = await this.verifyAuthentication(client);
			if (!isAuthenticated.isAuthenticated) {
				console.log('Invalid credentials');
				return;
			}
			const match = await this.matchmakingService.addToQueue(client.data.user.id);
			if (match) {
				this.proposeMatchToPlayers(match, client);
			} else {
				client.emit('joinedQueue', { message: 'You have joined the matchmaking queue.' });
			}
		} catch (error) {
			console.error('Error in handleMessage:', error.message);
		}
	}

	private async proposeMatchToPlayers(match: Match, client: Socket) {
		this.server.to(`user_${match.playerOne.id}`).emit('matchProposal', match);
		this.server.to(`user_${match.playerTwo.id}`).emit('matchProposal', match);

		// Set a timeout for match acceptance
		const matchAcceptanceTimeout = 20 * 1000; // 20 seconds
		setTimeout(async () => {
			const { accepted, rematchPlayerId } = await this.matchmakingService.checkMatchResponses(
				match.id,
			);
			if (!accepted) {
				// Benachrichtigung an die Clients senden
				this.server.to(`user_${match.playerOne.id}`).emit('matchProposalExpired');
				this.server.to(`user_${match.playerTwo.id}`).emit('matchProposalExpired');

				// Spieler, der ein Rematch benötigt, wieder in die Queue einreihen
				if (rematchPlayerId) {
					// await this.matchmakingService.removeFromQueue(rematchPlayerId);
					await this.matchmakingService.addToQueue(rematchPlayerId);
					console.log('queue after response times end: ', this.matchmakingService.queue);
				}
			}
		}, matchAcceptanceTimeout);
	}

	//TODO: DTO here pls
	@SubscribeMessage('respondToMatch')
	async respondToMatch(
		@MessageBody() data: { matchId: number; accept: boolean },
		@ConnectedSocket() client: Socket,
	) {
		try {
			console.log(
				`Respond to match received, matchId: ${data.matchId}, accept: ${data.accept}, userId: ${client.data.user.id}`,
			);
			const userId = client.data.user.id;
			const response = await this.matchmakingService.handleMatchResponse(
				data.matchId,
				userId,
				data.accept,
			);
			console.log('response: ', response);
			if (response.matchStarted) {
				// Navigiere beide Spieler zum Spiel
				console.log('Match started, navigating players to game');
				this.server
					.to(`user_${response.playerOneId}`)
					.emit('matchStart', { matchId: data.matchId });
				this.server
					.to(`user_${response.playerTwoId}`)
					.emit('matchStart', { matchId: data.matchId });
			} else if (!response.matchStarted && response.rematchPlayerId) {
				// Der andere Spieler bleibt in der Queue
				this.server.to(`user_${response.rematchPlayerId}`).emit('remainInQueue');
			}
		} catch (error) {
			console.error('Error in respondToMatch:', error.message);
		}
	}

	@SubscribeMessage('leaveQueue')
	async handleLeaveQueue(@ConnectedSocket() client: Socket) {
		try {
			const isAuthenticated = await this.verifyAuthentication(client);
			if (!isAuthenticated.isAuthenticated) {
				console.log('Invalid credentials');
				return;
			}

			this.matchmakingService.removeFromQueue(isAuthenticated.userId);
		} catch (error) {
			console.error('Error in handleLeaveQueue:', error.message);
		}
	}

	//TODO: DTO here pls
	@SubscribeMessage('sendMessageToChatRoom')
	async handleMessageToChatRoom(
		@MessageBody() data: { chatRoomId: string; content: string },
		@ConnectedSocket() client: Socket,
	) {
		try {
			const isAuthenticated = await this.verifyAuthentication(client);
			if (!isAuthenticated.isAuthenticated) {
				console.log('Invalid credentials');
				return;
			}

			const chatRoom: ChatRoom = await this.chatService.getChatRoomById(data.chatRoomId);
			const mutes: Mute[] = chatRoom.mutes;
			const activeMute = mutes.find(
				(mute) => mute.userId === isAuthenticated.userId && new Date(mute.endTime) > new Date(),
			);
			if (activeMute) {
				const endTime = new Date(activeMute.endTime);
				const remainingTime = endTime.getTime() - new Date().getTime();

				let timeMessage = '';

				const remainingSeconds = Math.ceil(remainingTime / 1000); // convert to seconds
				const remainingMinutes = Math.ceil(remainingTime / (1000 * 60)); // convert to minutes

				// If the remaining time is less than 5 minutes, display in seconds
				if (remainingSeconds <= 5 * 60) {
					timeMessage = `${remainingSeconds} second(s)`;
				} else {
					// Otherwise, display in minutes
					timeMessage = `${remainingMinutes} minute(s)`;
				}
				// Emit a message to the user informing them they are muted with the remaining time
				this.server.to(`user_${isAuthenticated.userId}`).emit('receiveMessage', {
					content: `You are currently muted and cannot send messages. Time left: ${timeMessage}.`,
					senderId: isAuthenticated.userId,
					senderName: 'System',
					receiverId: chatRoom.id,
					id: isAuthenticated.userId,
				});
				return;
			} else {
				// Check if there are any expired mutes and delete them.
				const expiredMutes = mutes.filter((mute) => new Date(mute.endTime) <= new Date());
				for (const expiredMute of expiredMutes) {
					await this.chatService.deleteMute(expiredMute.id);
				}
			}
			//console.log('handleMessage arrived, Chat entry gets created:', data.content);
			const message = await this.chatService.saveChatRoomMessage(
				data.chatRoomId,
				isAuthenticated.userId,
				data.content,
			);
			//console.log('the new message is: ', message);

			// Emit the message to all ChatROomUsers if they're online
			//console.log('chatroom users: ', chatRoom.users);
			const currUser = await this.userService.findProfileById(isAuthenticated.userId);
			for (const user of chatRoom.users) {
				const recipient = await this.userService.findProfileById(user.id);
				if (recipient.blocklist.some((blockedUser) => blockedUser.id === currUser.id)) {
					//console.log('User is blocked!');
					// If the sender is on the recipient's blocklist, censor the message
					this.server.to(`user_${user.id}`).emit('receiveMessage', {
						content: '[Message Hidden]',
						senderId: message.senderId,
						senderName: 'Blocked User',
						receiverId: message.receiverId,
						id: message.id,
					});
				} else {
					// Emit the message to each user's individual socket room
					this.server.to(`user_${user.id}`).emit('receiveMessage', {
						content: message.content,
						senderId: message.senderId,
						senderName: message.senderName,
						receiverId: message.receiverId,
						id: message.id,
					});
				}
			}
		} catch (error) {
			console.error('Error in handleMessage:', error.message); //TODO: del before eval.
		}
	}
}
