import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { parse } from 'uuid';
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
		const req = client.request;
		const cookies = req.headers.cookie;
		if (!cookies) return;

		// TODO if no cookie and not auth then spectator
		const parsedCookies = parse(cookies);
		const playerId = parsedCookies.playerID;
		console.log(playerId);
	}

	/* handleDisconnect(client: Socket) {
		console.log('PongGateway: handleDisconnet', client.id);
	} */

	@SubscribeMessage('checkId')
	checkId(@ConnectedSocket() client: Socket, @MessageBody() id: string) {
		// TODO
		return true;
	}

	@SubscribeMessage('page-reload')
	async handleReload(@ConnectedSocket() client: Socket, @MessageBody() gameURL: string) {
		// console.log(gameURL);
		await client.join(gameURL);
		const userId = this.pongService.validateCookie(client);
		const status = this.pongService.getUserStatusForGame(userId, gameURL);
		console.log('STATUS', status);
		if (status !== 'player1' && status !== 'player2') return;

		const pongGame = this.pongService.getPongGameById(gameURL);
		client.on('update-keystate', (payload: any) => {
			this.pongService.updateKeystate(pongGame, payload);
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
		client.emit('pong-game-ready', pongGame.gameURL);
	}

	/* @SubscribeMessage('join-game')
	async handleJoinGame(@ConnectedSocket() client: Socket) {
		const userId = this.pongService.validateCookie(client);
	} */
}
