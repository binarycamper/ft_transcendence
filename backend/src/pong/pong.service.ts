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
import { User } from 'src/user/user.entity';
import { UserService } from 'src/user/user.service';
import { validate } from 'class-validator';
import { finished } from 'stream';
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
		//console.log('Game: ', game);
		if (game.player2.computer) {
			this.gameMap.delete(game.gameURL);
			return;
		}

		const endTime = new Date();
		const timePlayed = Math.round((endTime.getTime() - game.startTime.getTime()) / 1000);

		const player1 = await this.userService.findProfileById(game.player1.id);
		const player2 = await this.userService.findProfileById(game.player2.id);
		console.log('game.playerOneId: ', game.player1.id);
		console.log('game.playerTwoId: ', game.player2.id);

		//Update the USer status.
		player1.status = 'online';
		player2.status = 'online';
		this.userService.updateUser(player1);
		this.userService.updateUser(player2);

		//save the game.
		// Determine the winner
		let winnerId = null;
		if (game.gameState.scoreL > game.gameState.scoreR) {
			winnerId = game.player1.id;
		} else if (game.gameState.scoreL < game.gameState.scoreR) {
			winnerId = game.player2.id;
		} else {
			console.log('Invalid game');
			this.gameMap.delete(game.gameURL);
			return;
		}
		// Save the game history
		const history = new History();
		history.playerOne = player1;
		history.playerTwo = player2;
		history.scorePlayerOne = game.gameState.scoreL;
		history.scorePlayerTwo = game.gameState.scoreR;
		history.startTime = game.startTime;
		history.endTime = new Date();
		history.timePlayed = timePlayed;
		history.winnerId = winnerId;
		const tmp = await this.historyRepository.create(history);
		await this.historyRepository.save(tmp);

		this.gameMap.delete(game.gameURL);
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

	validateSettings(gameSettings: PongGameSettings) {
		if (!gameSettings) return false;

		// if (!compareStuctureOfJSONs(gameSettings, this.defaultSettings)) return false;
		// fix keyMap bug

		// TODO: dto

		return true;
	}

	setPlayerTwoId(userId: string, gameURL: string) {
		const game = this.gameMap.get(gameURL);
		if (game) {
			// Set player two's ID
			game.playerTwoId = userId;

			// Update the gameMap with the modified game
			this.gameMap.set(gameURL, game);

			// Update the playerMap with the new status
			//this.playerMap.set(userId, { game, status: 'player2' });

			// Other logic if needed, e.g., notify players that the game is ready to start
		} else {
			// Handle the case where the game is not found
			console.error(`Game with URL ${gameURL} not found.`);
		}
	}

	setPlayerOneId(userId: string, gameURL: string) {
		const game = this.gameMap.get(gameURL);
		if (game) {
			// Set player two's ID
			game.playerOneId = userId;
			// Update the gameMap with the modified game
			this.gameMap.set(gameURL, game);
			// Update the playerMap with the new status
		} else {
			// Handle the case where the game is not found
			console.error(`Game with URL ${gameURL} not found.`);
		}
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

	async validateCustomSettings(gameSettings: PongGameSettings) {
		const classInstance = plainToClass(PongGameSettingsDto, gameSettings);
		const validationErrors = await validate(classInstance);
		if (validationErrors.length > 0) {
			/* console.log(validationErrors); */
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

			console.log(decoded);
		} catch (error) {
			return null;
		}

		client.data.user = decoded;

		return decoded.id;
	}
}

type PlayerStatus = 'player1' | 'player2';
