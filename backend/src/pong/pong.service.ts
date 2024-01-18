import PongGame, { PongGameSettings } from './classes/PongGame';
import { Injectable } from '@nestjs/common';
import { parse } from 'cookie';
import { PongGateway } from './pong.gateway';
import { randomBytes } from 'crypto';
import { Socket } from 'socket.io';

@Injectable()
export class PongService {
	constructor(
		// @Inject(forwardRef(() => PongGateway))
		private readonly pongGateway: PongGateway,
	) {
		this.startUpdateLoop();
	}

	/* ------- PROPERTIES ------- */
	private readonly defaultSettings = new PongGameSettings();
	private readonly updateInterval = 1000 / 60; /* milliseconds */
	private intervalId: NodeJS.Timeout = null;
	/*                      <gameURL, pongGame> */
	private gameMap = new Map<string, PongGame>();
	private pendingGames = new Array<PongGame>();
	/*                       <playerID, <gameURL, playerStatus>> */
	private playerMap = new Map<string, { game: PongGame; status: PlayerStatus }>();

	/* ------- METHODS ------- */
	startUpdateLoop() {
		if (!this.intervalId)
			this.intervalId = setInterval(() => this.updateLoop(), this.updateInterval);
	}
	stopUpdateLoop() {
		clearInterval(this.intervalId);
		this.intervalId = null;
	}
	updateLoop() {
		this.gameMap.forEach((game, gameURL) => {
			game.pongEngine.update();
			this.pongGateway.server.to(gameURL).emit('update-game-state', game.gameState);
			if (game.gameState.gameOver) {
				game.status = 'finished';
				this.storeHistory(game);
			}
		});
	}

	storeHistory(game: PongGame) {
		//TODO: JJ History, crab here
		this.gameMap.delete(game.gameURL);
		this.pongGateway.server.to('lobby').emit('lobby-stats', this.getOnlineStats());
	}

	getPongGameById(gameURL: string) {
		return this.gameMap.get(gameURL);
	}

	validateSettings(gameSettings: PongGameSettings) {
		if (!gameSettings) return false;

		// if (!compareStuctureOfJSONs(gameSettings, this.defaultSettings)) return false;
		// fix keyMap bug

		// TODO: dto

		return true;
	}

	createNewGame(gameSettings: PongGameSettings, userId: string, computer = false) {
		if (!this.validateSettings(gameSettings)) {
			gameSettings = this.defaultSettings;
		}
		const gameCode = this.generateRandomCode();
		const newPongGame = new PongGame(gameCode, gameSettings, computer);

		newPongGame.player1.id = userId;
		this.playerJoinedGame(newPongGame, userId, 'player1');
		if (computer) {
			this.gameMap.set(gameCode, newPongGame);
		} else {
			this.pendingGames.push(newPongGame);
		}

		this.pongGateway.server.to('lobby').emit('lobby-stats', this.getOnlineStats());
		return newPongGame;
	}

	generateRandomCode(length = 12): string {
		const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
		let gameCode = '';
		const randomBytesArray = randomBytes(length);
		randomBytesArray.forEach((byte) => {
			const characterIndex = byte % characters.length;
			gameCode += characters[characterIndex];
		});
		if (this.gameMap.has(gameCode)) return this.generateRandomCode();

		return gameCode;
	}

	validateCookie(client: Socket) {
		const req = client.request;
		const cookies = req.headers.cookie;
		if (!cookies) return null;

		const parsedCookies = parse(cookies);
		const playerId = parsedCookies.playerID;
		// console.log(playerId);

		return playerId;
	}

	getUserStatusForGame(userId: string, gameURL: string) {
		const player = this.playerMap.get(userId);
		if (!player) return 'spectator';

		return player.status;
	}

	getPlayer(userId: string) {
		return this.playerMap.get(userId);
	}

	updateKeystate(pongGame: PongGame, player: string, payload: any) {
		// TODO check for player
		pongGame[player].keyState[payload.key] = payload.pressed;
		// console.log(pongGame[player].keyState);
	}

	handleConnection(playerId: string) {
		if (!this.playerMap.has(playerId)) {
			this.playerMap.set(playerId, null);
		}

		this.pongGateway.server.to('lobby').emit('lobby-stats', this.getOnlineStats());
	}

	handleDisconnect(playerId: string) {
		this.cancelPendingGame(playerId);

		// this.playerMap.delete(playerId);

		// this.pongGateway.server.of('lobby').emit('lobby-stats', this.playerMap.size);
		this.pongGateway.server.to('lobby').emit('lobby-stats', this.getOnlineStats());
	}

	getOnlineStats() {
		return {
			games: this.gameMap.size,
			players: this.playerMap.size,
			waiting: this.pendingGames.length,
		};
	}

	findPendingGame() {
		// const [pongGame] = Array.from(this.pendingGameMap);
		/* const pongGame = this.pendingGames[0];
		console.log(pongGame);

		return pongGame ?? null; */
		return this.pendingGames[0];
	}

	joinPendingGame(userId: string) {
		const pongGame = this.findPendingGame();
		if (!pongGame) return null;

		pongGame.player2.id = userId;
		this.playerJoinedGame(pongGame, userId, 'player2');

		this.gameMap.set(pongGame.gameURL, pongGame);
		this.pendingGames.shift();
		pongGame.status = 'running';
		return pongGame.gameURL;
	}

	playerJoinedGame(game: PongGame, userId: string, status: PlayerStatus) {
		this.playerMap.set(userId, { game, status });
		/* if (this.playerMap.has(userId)) {
			const player = this.playerMap.get(userId);
			player.game = game;
			player.status = status;
		} else {
			this.playerMap.set(userId, { game, status });
		} */
	}

	getPlayerGameStatus(playerId: string) {
		const player = this.getPlayer(playerId);
		if (player?.game.status === 'running') {
			return { gameURL: player.game.gameURL, queuing: false };
		}
		const queuing = player?.game.status === 'pending' || false;
		return { gameURL: null, queuing };
	}

	cancelPendingGame(playerId: string) {
		if (this.playerMap.has(playerId)) {
			const player = this.playerMap.get(playerId);
			if (player?.game.status === 'pending') {
				const gameIndex = this.pendingGames.findIndex((game) => game === player.game);
				this.pendingGames.splice(gameIndex, 1);
			}
		}
	}
}

type PlayerStatus = 'player1' | 'player2';
