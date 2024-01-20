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
		setInterval(() => this.updateLoop(), this.updateInterval);
		setInterval(() => this.startQueue(), this.queueInterval);
	}

	/* ------- PROPERTIES ------- */
	// private readonly defaultSettings = new PongGameSettings();
	private readonly queueInterval = 6_000; /* milliseconds */
	private readonly updateInterval = 1000 / 60; /* milliseconds */
	/*                      <gameURL, pongGame> */
	private gameMap = new Map<string, PongGame>();
	private pendingQueue = new Array<string>();
	private finishedGames = new Array<PongGame>();

	/*                       <playerID, <gameURL, playerStatus>> */
	/* private */ playerMap = new Map<string, { game: PongGame; status: PlayerStatus }>();

	/* ------- METHODS ------- */
	startQueue() {
		while (this.pendingQueue.length >= 2) {
			const player1 = this.pendingQueue.shift();
			const player2 = this.pendingQueue.shift();
			const gameURL = this.createNewDefaultGame(player1, player2);
			this.pongGateway.server.to(player1).to(player2).emit('pong-game-created', gameURL);
		}
	}

	joinQueue(userId: string) {
		const index = this.pendingQueue.findIndex((id) => id === userId);
		if (index !== -1) return;

		this.pendingQueue.push(userId);
	}

	cancelPendingGame(userId: string) {
		const index = this.pendingQueue.findIndex((id) => id === userId);
		if (index !== -1) {
			this.pendingQueue.splice(index, 1);
		}
		//TODO
	}

	createNewDefaultGame(player1: string, player2: string) {
		const gameCode = this.generateRandomCode();
		const game = new PongGame(gameCode);

		game.player1.id = player1;
		game.player2.id = player2;
		this.playerMap.set(player1, { game, status: 'player1' });
		this.playerMap.set(player2, { game, status: 'player2' });

		this.gameMap.set(gameCode, game);
		console.log(this.gameMap);

		return game.gameURL;
	}

	async updateLoop() {
		this.gameMap.forEach((game, gameURL) => {
			game.pongEngine.update();
			this.pongGateway.server.to(gameURL).emit('update-game-state', game.gameState);
			if (game.gameState.status === 'finished') {
				this.finishedGames.push(game);
				this.playerMap.set(game.player1.id, null);
				this.playerMap.set(game.player2.id, null);
				this.gameMap.delete(gameURL);
			}
		});

		while (this.finishedGames.length > 0) {
			await this.storeHistory(this.finishedGames.shift());
		}
	}

	markPlayerReady(userId: string, gameURL: string) {
		const game = this.getPongGameById(gameURL);
		if (!game) return false;

		const status = this.getPlayerStatusForGame(userId);
		if (status === 'player1') {
			game.player1.isReady = true;
		} else if (status === 'player2') {
			game.player2.isReady = true;
		} else {
			return false;
		}
		if (game.player1.isReady && game.player2.isReady) {
			game.gameState.status = 'running';
		}

		return true;
	}

	resignGame(game: PongGame, player: PlayerStatus) {
		game.gameState.status = 'finished';
		game.gameState.winnerId = player === 'player1' ? game.player2.id : game.player1.id;
	}

	getPlayer(userId: string) {
		return this.playerMap.get(userId);
	}

	getPlayerStatusForGame(userId: string) {
		const player = this.playerMap.get(userId);
		return player?.status || 'spectator';
	}

	getPongGameById(gameURL: string) {
		return this.gameMap.get(gameURL);
	}

	getOnlineStats() {
		return {
			games: this.gameMap.size,
			players: this.playerMap.size,
			waiting: this.pendingQueue.length,
		};
	}

	updateKeystate(
		game: PongGame,
		player: 'player1' | 'player2',
		payload: { key: string; player: number; pressed: boolean },
	) {
		game[player].keyState[payload.key] = payload.pressed;
	}

	validateCustomSettings(gameSettings: PongGameSettings) {
		const classInstance = plainToClass(PongGameSettingsDto, gameSettings);
		try {
			const validationErrors = validateSync(classInstance);
			if (validationErrors.length > 0) {
				console.log(validationErrors);
			}
		} catch (error) {
			console.log(error);
			return false;
		}
		if (classInstance.ballSpeed !== classInstance.paddleSpeed) return false;

		return true;
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
		} catch (error) {
			console.error('Error verifying token:', error);
			return null;
		}

		// client.data.user = decoded;
		return decoded.id;
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

		const { winnerId } = game.gameState;
		if (winnerId === player1.id) {
			player1.ladderLevel += 1;
		} else if (winnerId === player2.id) {
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

		// this.pongGateway.server.to('lobby').emit('lobby-stats', this.getOnlineStats());
	}

	async findAllHistory(): Promise<History[]> {
		const tmpHis = await this.historyRepository.find({ relations: ['playerTwo', 'playerOne'] });
		if (!tmpHis) return [];
		return tmpHis;
	}

	async findAllGames() {
		const gamePromises = Array.from(this.gameMap.values()).map(async (game) => {
			// Using async here to allow await inside the map
			const userOne = await this.userService.findProfileById(game.player1.id);

			let playerTwoName;
			if (game.player2.computer) {
				playerTwoName = 'Computer';
			} else {
				const userTwo = await this.userService.findProfileById(game.player2.id);
				playerTwoName = userTwo ? userTwo.name : 'Unknown Player';
			}

			return {
				gameURL: game.gameURL,
				status: game.gameState.status,
				startTime: game.startTime,
				playerOneName: userOne ? userOne.name : 'Unknown Player',
				playerTwoName: playerTwoName,
				// ... include other properties as needed
			};
		});
		const gamesArray = await Promise.all(gamePromises);
		//console.log(gamesArray);
		return gamesArray;
	}
}

type PlayerStatus = 'player1' | 'player2';
