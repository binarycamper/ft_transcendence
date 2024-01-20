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
import { JoinRoomDto, LeaveRoomDto } from './pong.dto';

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

	/* handleConnection(client: Socket) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		this.pongService.handleConnection(userId);
	} */

	handleDisconnect(client: Socket) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		this.pongService.cancelPendingGame(userId);
	}

	@SubscribeMessage('cancel-game-request')
	cancelGameRequest(@ConnectedSocket() client: Socket) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return null;

		this.pongService.cancelPendingGame(userId);

		return 'success';
	}

	@SubscribeMessage('resign-game')
	handleResignGame(@ConnectedSocket() client: Socket) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		const player = this.pongService.getPlayer(userId);
		if (!player?.game) return;

		this.pongService.resignGame(player.game, player.status);
	}

	@SubscribeMessage('player-ready')
	handlePlayerReady(@ConnectedSocket() client: Socket, @MessageBody() gameURL: string) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return false;

		return this.pongService.markPlayerReady(userId, gameURL);
	}

	@SubscribeMessage('join-queue')
	async handleJoinQueue(@ConnectedSocket() client: Socket) {
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		this.pongService.joinQueue(userId);

		await client.join(userId);
		this.server.to('lobby').emit('lobby-stats', this.pongService.getOnlineStats());
	}

	@SubscribeMessage('leave-queue')
	async handleLeaveQueue(@ConnectedSocket() client: Socket) {
		await client.leave(client.id);
		this.server.to('lobby').emit('lobby-stats', this.pongService.getOnlineStats());
	}

	@SubscribeMessage('join-lobby')
	async joinLobby(@ConnectedSocket() client: Socket) {
		await client.join('lobby');
		this.server.to('lobby').emit('lobby-stats', this.pongService.getOnlineStats());
	}

	@SubscribeMessage('leave-lobby')
	async leaveLobby(@ConnectedSocket() client: Socket) {
		await client.leave('lobby');
	}

	@SubscribeMessage('join-room')
	async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() gameURL: string) {
		await client.join(gameURL);
		const userId = this.pongService.verifyAuthentication(client);
		if (!userId) return;

		const player = this.pongService.getPlayerStatusForGame(userId);
		if (player !== 'player1' && player !== 'player2') return;

		const game = this.pongService.getPongGameById(gameURL);
		const updateKeystate = (payload: any) => this.pongService.updateKeystate(game, player, payload);
		client.on('update-keystate', updateKeystate);
		client.once('leave-room', () => client.off('update-keystate', updateKeystate));
	}

	@SubscribeMessage('leave-room')
	async leaveRoom(@ConnectedSocket() client: Socket, @MessageBody() gameURL: string) {
		await client.leave(gameURL);
	}
}
