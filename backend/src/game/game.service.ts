//game.service.ts
import { Inject, Injectable, InternalServerErrorException, forwardRef } from '@nestjs/common';
import { Game } from './game.entity';
import { Brackets, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/user.entity';
import { GameUpdateDto } from './dto/dto';
import { EventsGateway } from 'src/events/events.gateway';

const gameHeight = 800; // game field's height

@Injectable()
export class GameService {
	constructor(
		@InjectRepository(Game)
		private gameRepository: Repository<Game>,
		@Inject(forwardRef(() => EventsGateway))
		private eventsGateway: EventsGateway,
	) {}

	async findExistingGame(playerOneId: string, playerTwoId: string): Promise<Game | undefined> {
		return await this.gameRepository
			.createQueryBuilder('game')
			.leftJoinAndSelect('game.playerOne', 'playerOne')
			.leftJoinAndSelect('game.playerTwo', 'playerTwo')
			.where(
				new Brackets((qb) => {
					qb.where('playerOne.id = :playerOneId AND playerTwo.id = :playerTwoId', {
						playerOneId,
						playerTwoId,
					}).orWhere('playerOne.id = :playerTwoId AND playerTwo.id = :playerOneId', {
						playerOneId: playerTwoId,
						playerTwoId: playerOneId,
					});
				}),
			)
			.getOne();
	}

	async createNewGame(player: User, opponent: User): Promise<Game> {
		try {
			const existingGame = await this.findExistingGame(player.id, opponent.id);

			if (!existingGame) {
				const game = this.gameRepository.create({
					playerOne: player,
					playerTwo: opponent,
					scorePlayerOne: 0,
					scorePlayerTwo: 0,
					startTime: new Date(),
					winnerId: null,
					acceptedOne: true, // Player one has initiated the game
					acceptedTwo: false, // Player two has not accepted yet
				});

				await this.gameRepository.save(game);
				return game;
			} else if (
				player.id === existingGame.playerTwo.id &&
				opponent.id === existingGame.playerOne.id
			) {
				//existingGame.acceptedTwo = true; // Player two accepts the game
				existingGame.acceptedTwo = true;
				await this.gameRepository.save(existingGame);

				// Emit event to notify that the game is ready

				//this.eventsService.emitToUser(opponent.id, player.name);
				//console.log('emit the game here:');
				this.eventsGateway.server.to(`user_${opponent.id}`).emit('game-ready', {
					opponentName: player.name,
				});
			}
			return existingGame;
		} catch (error) {
			//console.log(`Failed to create game: ${error.message}`, error.stack);
			throw new InternalServerErrorException(`Failed to create game: ${error.message}`);
		}
	}

	async getAllGames() {
		return await this.gameRepository.find({
			relations: ['playerOne', 'playerTwo'],
		});
	}

	async findGameByUserId(userId: string): Promise<Game | undefined> {
		return await this.gameRepository.findOne({
			where: [{ playerOne: { id: userId } }, { playerTwo: { id: userId } }],
			order: {
				startTime: 'DESC',
			},
			relations: ['playerOne', 'playerTwo'],
		});
	}

	async findGameById(gameId: string): Promise<Game | undefined> {
		return await this.gameRepository.findOne({
			where: [{ playerOne: { id: gameId } }, { playerTwo: { id: gameId } }],
			order: {
				startTime: 'DESC',
			},
			relations: ['playerOne', 'playerTwo'],
		});
	}

	async deleteGame(game: Game) {
		await this.gameRepository.remove(game);
	}

	async getOpponentGame(opponentName: string): Promise<Game | undefined> {
		return await this.gameRepository.findOne({
			where: [{ playerOne: { name: opponentName } }, { playerTwo: { name: opponentName } }],
			order: {
				startTime: 'DESC',
			},
			relations: ['playerOne', 'playerTwo'],
		});
	}

	async deleteAllGames() {
		const games = await this.gameRepository.find({});
		await this.gameRepository.remove(games);
	}

	async saveGame(game: Game) {
		await this.gameRepository.save(game);
	}

	async updateGame(gameUpdateDto: GameUpdateDto, userId: string) {
		const game = await this.findGameById(userId);
		if (!game) {
			throw new InternalServerErrorException('Game not found');
		}
		game.scorePlayerOne = gameUpdateDto.scorePlayerOne;
		game.scorePlayerTwo = gameUpdateDto.scorePlayerTwo;
		game.winnerId = gameUpdateDto.winnerId;
		game.endTime = gameUpdateDto.endTime;
		await this.gameRepository.save(game);
	}

	async updatePaddle(userId: string, key: string) {
		const game = await this.findGameById(userId);

		// Determine which player is making the move
		const isPlayerOne = userId === game.playerOne.id;

		// Calculate new paddle position based on key press
		const paddleMovement = key === 'up' ? -1 : 1;
		if (isPlayerOne) {
			game.playerOnePaddle = Math.max(
				0,
				Math.min(game.playerOnePaddle + paddleMovement, gameHeight - 100),
			);
		} else {
			game.playerTwoPaddle = Math.max(
				0,
				Math.min(game.playerTwoPaddle + paddleMovement, gameHeight - 100),
			);
		}
		await this.gameRepository.save(game);
		return game;
	}

	async updateGameMode(userId: string, gameMode: boolean): Promise<void> {
		try {
			const game = await this.findGameByUserId(userId);

			if (!game) {
				throw new InternalServerErrorException('Game not found');
			}

			// Update the game mode for the user
			game.gameMode = gameMode;

			// Save the updated game
			await this.gameRepository.save(game);
		} catch (error) {
			throw new InternalServerErrorException(`Failed to update game mode: ${error.message}`);
		}
	}

	async updateScore(userId: string, scorePlayerOne: number, scorePlayerTwo: number): Promise<Game> {
		const game = await this.findGameByUserId(userId);
		if (!game) {
			throw new InternalServerErrorException('Game not found');
		}
		if (scorePlayerOne === 10) {
			game.winnerId = game.playerOne.id;
		} else if (scorePlayerTwo === 10) {
			game.winnerId = game.playerTwo.id;
		}
		// Update the scores
		game.scorePlayerOne = scorePlayerOne;
		game.scorePlayerTwo = scorePlayerTwo;
		const maxScore = 10;
		if (game.scorePlayerOne >= maxScore) {
			game.winnerId = game.playerOne.id;
		} else if (game.scorePlayerTwo >= maxScore) {
			game.winnerId = game.playerTwo.id;
		}

		game.ballPosition = [600, 400]; // Assuming the center of your game field
		// Assign a new random direction to the ball
		game.ballDirection = [
			Math.random() * 2 - 1, // Random float between -1 and 1 for x direction
			Math.random() * 2 - 1, // Random float between -1 and 1 for y direction
		];
		// Normalize the direction to ensure consistent ball speed in any direction
		const length = Math.sqrt(game.ballDirection[0] ** 2 + game.ballDirection[1] ** 2);
		game.ballDirection[0] /= length;
		game.ballDirection[1] /= length;

		await this.gameRepository.save(game);
		return game;
	}
}
