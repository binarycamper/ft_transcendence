import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PongGameSettings } from './classes/PongGame';
import { PongService } from './pong.service';

/* @WebSocketGateway(8090, { cors: '*', credentials: true }) */
@Injectable()
@WebSocketGateway(8090, {
	/* cors: {
		credentials: true,
		origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8090'],
	}, */
	cors: { credentials: true, origin: 'http://localhost:5173' },
})
/* export class PongGateway implements OnGatewayConnection, OnGatewayDisconnect { */
export class PongGateway {
	constructor(
		@Inject(forwardRef(() => PongService))
		private readonly pongService: PongService,
	) {}

	@WebSocketServer()
	server: Server;

	/* afterInit() {
		instrument(this.server, {
			auth: false,
			mode: 'development',
		});
	} */

	onModuleInit() {
		this.server.on('connection', (socket) => {
			console.log('Pong: client connected', socket.id);

			socket.on('disconnect', (reason) => {
				console.log(`Pong: disconnect ${socket.id} due to ${reason}`);
			});
		});
	}

	handleConnection(client: Socket) {
		console.log('PongGateway: handleConnection', client.id);
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		this.pongService.handleConnection(userId);
	}

	handleDisconnect(client: Socket) {
		console.log('PongGateway: handleDisconnet', client.id);
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		this.pongService.handleDisconnect(userId);
	}

	@SubscribeMessage('page-reload')
	handleReload(@ConnectedSocket() client: Socket, @MessageBody() gameURL: string) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		const status = this.pongService.getUserStatusForGame(userId);
		if (status !== 'player1' && status !== 'player2') return;

		const game = this.pongService.getPongGameById(gameURL);
		client.on('update-keystate', (payload: any) => {
			this.pongService.updateKeystate(game, status, payload);
		});
	}

	@SubscribeMessage('join-game')
	async handleJoinGame(
		@ConnectedSocket() client: Socket,
		@MessageBody() gameSettings: PongGameSettings,
	) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		if (this.pongService.findActiveGame(userId)) return;

		const game = this.pongService.joinPendingGame(userId);
		if (game) {
			await client.join(game.gameURL);
			this.server.to(game.gameURL).emit('pong-game-ready', game.gameURL);
		} else {
			const game = this.pongService.createNewGame(userId, gameSettings);
			await client.join(game.gameURL);
		}
	}

	/* @SubscribeMessage('game-ready-acknowledgement')
	async handleGameReadyAcknowledgement(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { gameURL: string; userId: string },
	) {
		const isAuthenticated = this.verifyAuthentication(client);
		if (!isAuthenticated.isAuthenticated) {
			console.log('Invalid credentials');
			return;
		}
		if (data.userId !== isAuthenticated.userId) {
			this.pongService.setPlayerTwoId(data.userId, data.gameURL);
		}
		console.log(`User ID ${data.userId} acknowledged game ready for game URL ${data.gameURL}`);
	} */

	@SubscribeMessage('play-with-computer')
	async handlePlayWithComputer(
		@ConnectedSocket() client: Socket,
		@MessageBody() gameSettings: PongGameSettings,
	) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		const pongGame = this.pongService.createNewGame(userId, gameSettings, true);

		await client.join(pongGame.gameURL);
		client.emit('pong-game-ready', pongGame.gameURL);
	}

	@SubscribeMessage('play-with-friend')
	async handlePlayWithFriend(
		@ConnectedSocket() client: Socket,
		@MessageBody() gameSettings: PongGameSettings,
	) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		const game = this.pongService.createNewGame(userId, gameSettings);

		await client.join(game.gameURL);
		// client.emit('pong-game-ready', game.gameURL);
	}

	@SubscribeMessage('cancel-game-request')
	cancelGameRequest(@ConnectedSocket() client: Socket) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return null;

		const game = this.pongService.findActiveGame(userId);
		if (game?.status === 'pending') {
			this.pongService.cancelPendingGame(userId);
		}

		return 'success';
	}

	@SubscribeMessage('query-game-status')
	queryGameStatus(@ConnectedSocket() client: Socket) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return null;

		return this.pongService.getPlayerGameStatus(userId);
	}

	@SubscribeMessage('join-lobby')
	async joinLobby(@ConnectedSocket() client: Socket) {
		await client.join('lobby');
		return this.pongService.getOnlineStats();
	}

	@SubscribeMessage('leave-lobby')
	async leaveLobby(@ConnectedSocket() client: Socket) {
		await client.leave('lobby');
	}

	@SubscribeMessage('join-room')
	async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() gameURL: string) {
		await client.join(gameURL);
	}

	@SubscribeMessage('leave-room')
	async leaveRoom(@ConnectedSocket() client: Socket, @MessageBody() gameURL: string) {
		await client.leave(gameURL);
	}
}
