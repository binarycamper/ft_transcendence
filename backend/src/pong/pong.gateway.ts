import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketServer,
} from '@nestjs/websockets';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { parse } from 'cookie';
import { PongGameSettings } from './classes/PongGame';
import { PongService } from './pong.service';

/* @WebSocketGateway(8090, { cors: '*', credentials: true }) */
interface EnemyJoinData {
	playerTwoId: string; // ID of the enemy player joining the game
	url: string; // URL of the game room the enemy is joining
	// Other properties as needed, e.g.,
}
/* export class PongGateway implements OnGatewayConnection, OnGatewayDisconnect { */
export class PongGateway {
	constructor(
		@Inject(forwardRef(() => PongService))
		private readonly pongService: PongService,
		// private jwtService: JwtService,
	) {}

	@WebSocketServer()
	server: Server;

	/* afterInit() {
		instrument(this.server, {
			auth: false,
			mode: 'development',
		});
	} */

	handleConnection(client: Socket) {
		console.log('PongGateway: handleConnection', client.id);
		const playerId = this.parseCookie(client);
		this.pongService.handleConnection(playerId);
	}

	handleDisconnect(client: Socket) {
		console.log('PongGateway: handleDisconnet', client.id);
		const playerId = this.parseCookie(client);
		this.pongService.handleDisconnect(playerId);
	}

	@SubscribeMessage('checkId')
	checkId(@ConnectedSocket() client: Socket, @MessageBody() id: string) {
		// TODO
		return true;
	}

	@SubscribeMessage('page-reload')
	handleReload(@ConnectedSocket() client: Socket, @MessageBody() gameURL: string) {
		// console.log(gameURL);
		// await client.join(gameURL);
		const userId = this.pongService.validateCookie(client);
		const status = this.pongService.getUserStatusForGame(userId, gameURL);
		console.log('STATUS', status);
		if (status !== 'player1' && status !== 'player2') return;

		const pongGame = this.pongService.getPongGameById(gameURL);
		client.on('update-keystate', (payload: any) => {
			this.pongService.updateKeystate(pongGame, status, payload);
		});
	}

	@SubscribeMessage('create-custom-game')
	async handleCreateGame(
		@ConnectedSocket() client: Socket,
		@MessageBody() gameSettings: PongGameSettings,
	) {
		// const isValid = this.pongService.validateSettings(gameSettings);
		// if (!isValid) client.emit('invalid-custom-settings');
		if (gameSettings.computer) {
			console.log('computer');
		}
		const userId = this.pongService.validateCookie(client);

		const pongGame = this.pongService.createNewGame(gameSettings, userId);

		await client.join(pongGame.gameURL);

		// this.server.on('')
		// wait for other player to join

		// const gameURL = await this.waitPlayerJoined(client);
		// console.log('Both players have joined the game:', gameURL);

		client.emit('pong-game-created', pongGame.gameURL);

		/* const playerJoinedPromise = new Promise((resolve) => {
			client.on('player-joined', () => {
				resolve();
			});
		});

		await playerJoinedPromise;
		console.log('Another player joined the game'); */
	}

	@SubscribeMessage('join-game')
	async handleJoinGame(
		@ConnectedSocket() client: Socket,
		@MessageBody() gameSettings: PongGameSettings,
	) {
		const userId = this.pongService.validateCookie(client);

		const gameURL = this.pongService.joinPendingGame(userId);
		if (gameURL) {
			await client.join(gameURL);
			this.server.to(gameURL).emit('pong-game-ready', gameURL);
		} else {
			const pongGame = this.pongService.createNewGame(gameSettings, userId);
			await client.join(pongGame.gameURL);
		}
	}

	@SubscribeMessage('play-with-computer')
	async handlePlayWithComputer(
		@ConnectedSocket() client: Socket,
		@MessageBody() gameSettings: PongGameSettings,
	) {
		const userId = this.pongService.validateCookie(client);
		const pongGame = this.pongService.createNewGame(gameSettings, userId, true);

		await client.join(pongGame.gameURL);
		client.emit('pong-game-ready', pongGame.gameURL);
	}

	@SubscribeMessage('join-lobby')
	async joinLobby(@ConnectedSocket() client: Socket) {
		await client.join('lobby');
		return this.pongService.getOnlineStats();
	}

	@SubscribeMessage('query-game-status')
	queryGameStatus(@ConnectedSocket() client: Socket) {
		const playerId = this.parseCookie(client);
		return this.pongService.getPlayerGameStatus(playerId);
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

	parseCookie(client: Socket) {
		const req = client.request;
		const cookies = req.headers.cookie;
		if (!cookies) return null;

		const parsedCookies = parse(cookies);
		const playerId = parsedCookies.playerID;

		return playerId;
	}

	@SubscribeMessage('cancel-game-request')
	cancelGameRequest(@ConnectedSocket() client: Socket) {
		const playerId = this.parseCookie(client);
		this.pongService.cancelPendingGame(playerId);
		return 'success';
	}

	@SubscribeMessage('create-match')
	async handleCreateMatch(
		@ConnectedSocket() client: Socket,
		@MessageBody() gameSettings: PongGameSettings,
	) {
		console.log('create match started!');
		// const isValid = this.pongService.validateSettings(gameSettings);
		// if (!isValid) client.emit('invalid-custom-settings');
		if (gameSettings.computer) {
			console.log('computer!! SHould not work!, nobody needs computer');
			return;
		}

		const userId = this.pongService.validateCookie(client);

		const pongGame = this.pongService.createNewGame(gameSettings, userId);

		await client.join(pongGame.gameURL);

		client.emit('match-created', pongGame.gameURL);
	}

	@SubscribeMessage('enemy-join')
	async handleEnemyJoin(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: EnemyJoinData,
	): Promise<void> {
		// Validate the user's cookie and get the user ID
		console.log('enemy join started!');

		const userId = this.pongService.validateCookie(client);

		// Check if data has necessary properties
		if (data && data.playerTwoId && data.url) {
			// Emit the 'join-match' event to player two
			this.server.to(`user_${data.playerTwoId}`).emit('join-match', { url: data.url });
		} else {
			console.error('Invalid data received in handleEnemyJoin');
		}
	}
}
