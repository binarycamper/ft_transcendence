import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Game } from './game.entity';
import { Brackets, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/user.entity';
import { EventsGateway } from 'src/events/events.gateway';
import { ConnectedSocket, SubscribeMessage, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

@Injectable()
export class GameService {
	@WebSocketServer()
	server: Server;
	constructor(
		@InjectRepository(Game)
		private gameRepository: Repository<Game>,
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
				existingGame.acceptedTwo = true; // Player two accepts the game
				await this.gameRepository.save(existingGame);

				// Emit event to notify that the game is ready
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
		return await this.gameRepository.find({});
	}

	async findGameById(userId: string): Promise<Game | undefined> {
		return await this.gameRepository.findOne({
			where: [{ playerOne: { id: userId } }, { playerTwo: { id: userId } }],
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

	@SubscribeMessage('playerReady')
	async handlePlayerReady(@ConnectedSocket() client: Socket, data: { userId: string }) {
		try {
			// Logic to handle player readiness
			const game = await this.gameService.findGameById(data.userId);
			if (game) {
				if (game.playerOne.id === data.userId) {
					game.acceptedOne = true;
				} else if (game.playerTwo.id === data.userId) {
					game.acceptedTwo = true;
				}

				await this.gameService.saveGame(game);

				// If both players are ready, emit a 'gameStart' event to both players
				if (game.acceptedOne && game.acceptedTwo) {
					this.server.to(game.playerOne.id).emit('gameStart', game);
					this.server.to(game.playerTwo.id).emit('gameStart', game);
				}
			}
		} catch (error) {
			console.error(`Error in handlePlayerReady: ${error}`);
			// Handle error appropriately
		}
	}
}
