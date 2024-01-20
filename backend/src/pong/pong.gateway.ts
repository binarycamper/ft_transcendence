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
import { UserService } from 'src/user/user.service';
import { JoinRoomDto, LeaveRoomDto, PageReloadDto } from './pong.dto';

/* @WebSocketGateway(8090, { cors: '*', credentials: true }) */
@Injectable()
@WebSocketGateway(8090, {
	/* cors: {
		credentials: true,
		origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8090'],
	}, */
	cors: { credentials: true, origin: `http://${process.env.HOST_IP}:5173` },
})
/* export class PongGateway implements OnGatewayConnection, OnGatewayDisconnect { */
export class PongGateway {
	constructor(
		@Inject(forwardRef(() => PongService))
		private readonly pongService: PongService,
		private userService: UserService,
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
	handleReload(@ConnectedSocket() client: Socket, @MessageBody() pageReloadDto: PageReloadDto) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		const player = this.pongService.getPlayerStatusForGame(userId);
		if (player !== 'player1' && player !== 'player2') return;

		const game = this.pongService.getPongGameById(pageReloadDto.gameURL);
		client.on('update-keystate', (payload: any) => {
			this.pongService.updateKeystate(game, player, payload);
		});
		client.once('leave-room', (id: string) => {
			console.log(`${id}: ${player} has left`);
		});
		client.once('disconnect', () => {
			game[player].isConnected = false;
			game[player].timeStamp = performance.now();
			game.gameState.status = 'paused';

			console.log(player, 'has disconnected');
		});
	}

	@SubscribeMessage('join-game')
	async handleJoinGame(@ConnectedSocket() client: Socket) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		if (this.pongService.findActiveGame(userId)) return;

		const game = await this.pongService.joinPendingGame(userId);
		if (game) {
			await client.join(game.gameURL);
			this.server.to(game.gameURL).emit('pong-game-ready', game.gameURL);
		} else {
			const game = this.pongService.createNewGame(userId);
			await client.join(game.gameURL);
		}
	}

	@SubscribeMessage('play-with-computer')
	async handlePlayWithComputer(
		@ConnectedSocket() client: Socket,
		@MessageBody() gameSettings: PongGameSettings,
	) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		if (this.pongService.findActiveGame(userId)) return;

		const pongGame = this.pongService.createNewGame(userId, gameSettings, true);
		await client.join(pongGame.gameURL);
		const user = await this.userService.findProfileById(userId);
		user.status = 'ingame';
		await this.userService.updateUser(user);
		client.emit('pong-game-ready', pongGame.gameURL);
	}

	@SubscribeMessage('play-with-friend')
	async handlePlayWithFriend(
		@ConnectedSocket() client: Socket,
		@MessageBody() gameSettings: PongGameSettings,
	) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		if (this.pongService.findActiveGame(userId)) return;

		const game = this.pongService.createNewGame(userId, gameSettings);
		const user = await this.userService.findProfileById(userId);
		user.status = 'ingame';
		await this.userService.updateUser(user);
		await client.join(game.gameURL);
		// client.emit('pong-game-ready', game.gameURL);
	}

	@SubscribeMessage('cancel-game-request')
	cancelGameRequest(@ConnectedSocket() client: Socket) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return null;

		const game = this.pongService.findActiveGame(userId);
		if (game?.gameState.status === 'pending') {
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
	async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() joinRoomDto: JoinRoomDto) {
		await client.join(joinRoomDto.gameURL);
	}

	@SubscribeMessage('leave-room')
	async leaveRoom(@ConnectedSocket() client: Socket, @MessageBody() leaveRoomDto: LeaveRoomDto) {
		await client.leave(leaveRoomDto.gameURL);
	}
}
