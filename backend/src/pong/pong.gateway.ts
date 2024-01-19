import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { forwardRef, Inject, Injectable, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { parse } from 'cookie';
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

	/* verifyAuthentication(client: SocketWithUserData): {
		isAuthenticated: boolean;
		userId: string | null;
	} {
		const cookies = jjCookie.parse(client.handshake.headers.cookie || '');
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
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		// console.log(gameURL);
		// await client.join(gameURL);
		// const userId = this.pongService.validateCookie(client);
		const status = this.pongService.getUserStatusForGame(userId, gameURL);
		//console.log('STATUS', status);
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
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		const gameURL = this.pongService.joinPendingGame(userId);
		if (gameURL) {
			await client.join(gameURL);
			this.server.to(gameURL).emit('pong-game-ready', gameURL);
		} else {
			const pongGame = this.pongService.createNewGame(gameSettings, userId);
			// this.pongService.setPlayerOneId(isAuthenticated.userId, gameURL);
			//pongGame.playerTwoId = isAuthenticated.userId;
			//console.log('pongame: ', pongGame);
			await client.join(pongGame.gameURL);
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
}
