import PongGame, { PongGameSettings } from './classes/PongGame';
import { History } from './history.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { parse } from 'cookie';
import { plainToClass } from 'class-transformer';
import { PongGameSettingsDto } from './pong.dto';
import { PongGateway } from './pong.gateway';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Socket } from 'socket.io';
import { UserService } from 'src/user/user.service';
import { validateSync } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { DecodedToken } from 'src/events/dto/dto';

@Injectable()
export class PongService {
	constructor(
		// @Inject(forwardRef(() => PongGateway))
		private readonly pongGateway: PongGateway,
		private jwtService: JwtService,
		private userService: UserService,
		@InjectRepository(History)
		private historyRepository: Repository<History>,
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
	private finishedGames = new Array<PongGame>();

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

	async updateLoop() {
		this.gameMap.forEach((game, gameURL) => {
			game.pongEngine.update();
			this.pongGateway.server.to(gameURL).emit('update-game-state', game.gameState);
			if (game.gameState.gameOver) {
				game.status = 'finished';
				this.finishedGames.push(game);
				this.gameMap.delete(gameURL);
			}
		});

		while (this.finishedGames.length > 0) {
			console.log('start save history!');
			await this.storeHistory(this.finishedGames.shift());
		}
	}

	async storeHistory(game: PongGame) {
		if (game.player2.computer) return;

		const endTime = new Date();
		const timePlayed = Math.round((endTime.getTime() - game.startTime.getTime()) / 1000);

		const player1 = await this.userService.findProfileById(game.player1.id);
		const player2 = await this.userService.findProfileById(game.player2.id);

		if (!player1.achievements.includes('Gamer 🎮')) {
			player1.achievements.push('Gamer 🎮');
		}
		if (!player2.achievements.includes('Gamer 🎮')) {
			player2.achievements.push('Gamer 🎮');
		}
		player1.status = 'online';
		player2.status = 'online';

		let winnerId: string;
		if (game.gameState.scoreL > game.gameState.scoreR) {
			winnerId = game.player1.id;
			player1.ladderLevel += 1;
		} else if (game.gameState.scoreL < game.gameState.scoreR) {
			winnerId = game.player2.id;
			player2.ladderLevel += 1;
		} else {
			console.log('Invalid game');
			return;
		}

		// Save the updated user entity
		await this.userService.updateUser(player1);
		await this.userService.updateUser(player2);
		const history = new History();
		history.playerOne = player1;
		history.playerTwo = player2;
		history.scorePlayerOne = game.gameState.scoreL;
		history.scorePlayerTwo = game.gameState.scoreR;
		history.startTime = game.startTime;
		history.endTime = new Date();
		history.timePlayed = timePlayed;
		history.winnerId = winnerId;
		const entity = this.historyRepository.create(history);
		await this.historyRepository.save(entity);

		this.pongGateway.server.to('lobby').emit('lobby-stats', this.getOnlineStats());
	}

	async findAllHistory(): Promise<History[]> {
		const tmpHis = await this.historyRepository.find({ relations: ['playerTwo', 'playerOne'] });
		if (!tmpHis) return [];
		return tmpHis;
	}

	getPongGameById(gameURL: string) {
		return this.gameMap.get(gameURL);
	}

	createNewGame(userId: string, gameSettings: PongGameSettings, computer = false) {
		if (!this.validateCustomSettings(gameSettings)) {
			gameSettings = this.defaultSettings;
		}

		const gameCode = this.generateRandomCode();
		const game = new PongGame(gameCode, gameSettings, computer);

		game.player1.id = userId;
		this.playerMap.set(userId, { game, status: 'player1' });
		if (computer) {
			this.gameMap.set(gameCode, game);
			game.status = 'running';
		} else {
			this.pendingGames.push(game);
		}

		this.pongGateway.server.to('lobby').emit('lobby-stats', this.getOnlineStats());
		return game;
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

	getUserStatusForGame(userId: string) {
		const player = this.playerMap.get(userId);
		return player?.status || 'spectator';
	}

	getPlayer(userId: string) {
		return this.playerMap.get(userId);
	}

	updateKeystate(game: PongGame, player: string, payload: any) {
		// TODO check for player
		game[player].keyState[payload.key] = payload.pressed;
		// console.log(game[player].keyState);
	}

	handleConnection(userId: string) {
		if (!this.playerMap.has(userId)) {
			this.playerMap.set(userId, null);
		}

		this.pongGateway.server.to('lobby').emit('lobby-stats', this.getOnlineStats());
	}

	handleDisconnect(userId: string) {
		const game = this.findActiveGame(userId);
		if (game) {
			if (game.status === 'pending') {
				this.cancelPendingGame(userId);
			} else if (game.status !== 'paused' && game.status !== 'running') {
				this.playerMap.delete(userId);
			}
		}

		this.pongGateway.server.to('lobby').emit('lobby-stats', this.getOnlineStats());
	}

	getOnlineStats() {
		return {
			games: this.gameMap.size,
			players: this.playerMap.size,
			waiting: this.pendingGames.length,
		};
	}

	joinPendingGame(userId: string) {
		const [game] = this.pendingGames;
		if (!game) return null;

		game.player2.id = userId;
		this.playerMap.set(userId, { game, status: 'player2' });

		this.gameMap.set(game.gameURL, game);
		this.pendingGames.shift();
		game.status = 'running';
		return game;
	}

	getPlayerGameStatus(userId: string) {
		const game = this.findActiveGame(userId);
		if (game?.status === 'running') {
			return { gameURL: game.gameURL, queuing: false };
		}
		const queuing = game?.status === 'pending' || false;
		return { gameURL: null, queuing };
	}

	cancelPendingGame(userId: string) {
		const player = this.playerMap.get(userId);
		const gameIndex = this.pendingGames.findIndex((game) => game === player.game);
		this.pendingGames.splice(gameIndex, 1);
		player.game = null;

		this.pongGateway.server.to('lobby').emit('lobby-stats', this.getOnlineStats());
	}

	validateCustomSettings(gameSettings: PongGameSettings) {
		const classInstance = plainToClass(PongGameSettingsDto, gameSettings);
		try {
			const validationErrors = validateSync(classInstance);
			if (validationErrors.length > 0) {
				console.log(validationErrors);
			}
		} catch {
			return false;
		}
		if (classInstance.ballSpeed !== classInstance.paddleSpeed) return false;

		return true;
	}

	verifyAuthentication(client: Socket) {
		const req = client.request;
		const cookies = req.headers.cookie;
		if (!cookies) return null;

		const parsedCookies = parse(cookies);
		if (!parsedCookies.token) return null;

		const { token } = parsedCookies;
		let decoded: DecodedToken;
		try {
			decoded = this.jwtService.verify<DecodedToken>(token, {
				secret: process.env.JWT_SECRET,
			});

			// console.log(decoded);
		} catch (error) {
			console.error('Error verifying token:', error);
			return null;
		}

		client.data.user = decoded;

		return decoded.id;
	}

	findActiveGame(userId: string) {
		const player = this.playerMap.get(userId);
		return player?.game;
	}
}

type PlayerStatus = 'player1' | 'player2';
