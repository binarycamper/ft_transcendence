//eventsgateway.ts
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
import { UserService } from 'src/user/user.service';
import { ChatRoom } from 'src/chat/chatRoom.entity';
import { randomUUID } from 'crypto';
import { GameService } from 'src/game/game.service';
import { Game } from 'src/game/game.entity';

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
		private userService: UserService,
		private gameService: GameService,
	) {}

	//#####################################################CookieDecoderforSockets##########################################################
	async verifyAuthentication(
		client: Socket,
	): Promise<{ isAuthenticated: boolean; userId: string }> {
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
		const decoded = await this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
		if (decoded) {
			client.data.user = decoded;
			return { isAuthenticated: true, userId: decoded.id };
		}
		return { isAuthenticated: false, userId: '' };
	}

	//#####################################################UserStatus##########################################################

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

	//#####################################################ChatMessages##########################################################

	//TODO: DTO here pls
	@SubscribeMessage('send-message')
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
			console.error('Error in handleMessage:', error.message);
		}
	}

	//TODO: DTO here pls
	@SubscribeMessage('send-message-to-chatroom')
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
			const { mutes } = chatRoom;
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
			const expiredMutes = mutes.filter((mute) => new Date(mute.endTime) <= new Date());
			for (const expiredMute of expiredMutes) {
				await this.chatService.deleteMute(expiredMute.id);
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
			console.error('Error in handleMessage:', error.message); //TODO: del before eval.
		}
	}

	//################################################Game##########################################################

	@SubscribeMessage('playerReady')
	async handlePlayerReady(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { gameWidth: number; gameHeight: number },
	): Promise<void> {
		try {
			const isAuthenticated = await this.verifyAuthentication(client);
			if (!isAuthenticated.isAuthenticated) {
				console.error('Invalid credentials');
				return;
			}

			const game = await this.gameService.findGameByUserId(isAuthenticated.userId);
			if (!game) {
				console.error('Game not found');
				return;
			}

			// Update the accepted status of the player who is ready // so i toggle Matchmaking accept back to false to avoid using a new bool
			if (game.playerOne.id === isAuthenticated.userId) {
				game.acceptedOne = false;
			} else if (game.playerTwo.id === isAuthenticated.userId) {
				game.acceptedTwo = false;
			}

			// Check if both players are ready to start the game
			if (!game.acceptedOne && !game.acceptedTwo) {
				game.startTime = new Date();
				game.started = true;
				this.setRandomBallDirection(game);
				if (game.playerOne.id === isAuthenticated.userId) {
					game.playerOneGameWidth = data.gameWidth;
					game.playerOneGameHeight = data.gameHeight;
				} else if (game.playerTwo.id === isAuthenticated.userId) {
					game.playerTwoGameWidth = data.gameWidth;
					game.playerTwoGameHeight = data.gameHeight;
				}

				await this.gameService.saveGame(game);
				//this.gameService.startGameLoop(game.id);

				// Notify both players that the game has started
				this.server.to(`user_${game.playerOne.id}`).emit('gameStart', game);
				this.server.to(`user_${game.playerTwo.id}`).emit('gameStart', game);
			} else {
				await this.gameService.saveGame(game); // Save the partial state
			}
		} catch (error) {
			console.error(`Error in handlePlayerReady: ${error}`);
			// Handle error appropriately
		}
	}

	//################################tools for handlePlayerReady###########################################################

	private setRandomBallDirection(game: Game): void {
		do {
			game.ballDirection[0] = Math.random() * 2 - 1; // Random float between -1 and 1 for x direction
			game.ballDirection[1] = Math.random() * 2 - 1; // Random float between -1 and 1 for y direction
			this.normalizeBallDirection(game);
		} while (Math.abs(game.ballDirection[1]) < 0.3); // Avoid a horizontal trajectory
	}

	private normalizeBallDirection(game: Game): void {
		const length = Math.sqrt(
			Math.pow(game.ballDirection[0], 2) + Math.pow(game.ballDirection[1], 2),
		);
		game.ballDirection[0] /= length;
		game.ballDirection[1] /= length;
	}
	//#######################################################################################################################

	@SubscribeMessage('keydown')
	async keyDownHook(@ConnectedSocket() client: Socket, @MessageBody() data: { event: string }) {
		const isAuthenticated = await this.verifyAuthentication(client);
		if (!isAuthenticated.isAuthenticated) {
			console.log('Invalid credentials');
			return;
		}
		const game = await this.gameService.updatePaddle(isAuthenticated.userId, data.event);
		/*	if (isAuthenticated.userId === game.playerOne.id) {
			this.server.to(`user_${game.playerTwo.id}`).emit('handlePaddleUpdate', game);
		} else {
			this.server.to(`user_${game.playerOne.id}`).emit('handlePaddleUpdate', game);
		}*/
	}

	@SubscribeMessage('keyup')
	async keyUpHook(@ConnectedSocket() client: Socket, @MessageBody() data: { event: string }) {
		const isAuthenticated = await this.verifyAuthentication(client);
		if (!isAuthenticated.isAuthenticated) {
			console.log('Invalid credentials');
			return;
		}
		const game = await this.gameService.updatePaddle(isAuthenticated.userId, data.event);
		/*	if (isAuthenticated.userId === game.playerOne.id) {
			this.server.to(`user_${game.playerTwo.id}`).emit('handlePaddleUpdate', game);
		} else {
			this.server.to(`user_${game.playerOne.id}`).emit('handlePaddleUpdate', game);
		}*/
	}
}
