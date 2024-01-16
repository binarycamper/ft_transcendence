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
		setInterval(() => this.updateLoop(), this.updateInterval);
	}

	/* ------- PROPERTIES ------- */
	private readonly defaultSettings = new PongGameSettings();
	private readonly updateInterval = 1000 / 60; /* milliseconds */
	private intervalId: NodeJS.Timeout = null;
	/*                      <gameURL, pongGame> */
	private gameMap = new Map<string, PongGame>();
	private pendingGameMap = new Map<string, PongGame>();
	/*                       <playerID, <gameURL, playerStatus>> */
	private playerMap = new Map<string, Map<string, string>>();

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
		});
	}

	getPongGameById(id: string): PongGame | null {
		const pongGame = this.gameMap.get(id);
		return pongGame ?? null;
	}

	validateSettings(gameSettings: PongGameSettings) {
		if (!gameSettings) return false;

		// if (!compareStuctureOfJSONs(gameSettings, this.defaultSettings)) return false;
		// fix keyMap bug

		// TODO: dto

		return true;
	}

	createNewGame(gameSettings: PongGameSettings, userId: string) {
		if (!this.validateSettings(gameSettings)) {
			gameSettings = this.defaultSettings;
		}
		const gameCode = this.generateRandomCode();
		const newPongGame = new PongGame(gameCode, gameSettings);

		newPongGame.player1.id = userId;
		// console.log('new player', newPongGame.player1);

		this.gameMap.set(gameCode, newPongGame);

		if (this.playerMap.has(userId)) {
			const userValue = this.playerMap.get(userId);
			userValue.set(gameCode, 'player1');
		} else {
			this.playerMap.set(userId, new Map([[gameCode, 'player1']]));
		}

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
		const user = this.playerMap.get(userId);
		if (!user) return 'spectator';

		return user.get(gameURL);
	}

	updateKeystate(pongGame: PongGame, payload: any) {
		// TODO check for player
		pongGame.player1.keyState[payload.key] = payload.pressed;
		// console.log(pongGame.player1.keyState);
	}
}
