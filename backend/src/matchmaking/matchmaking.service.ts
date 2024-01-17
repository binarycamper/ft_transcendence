// src/matchmaking/matchmaking.service.ts

import {
	Inject,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Matchmaking } from './matchmaking.entity';
import { User } from 'src/user/user.entity';
import { EventsGateway } from 'src/events/events.gateway';
import { Game } from 'src/game/game.entity';

@Injectable()
export class MatchmakingService {
	private readonly matchmakingInterval = 10_000;
	private matchmakingQueue: Matchmaking[] = [];
	constructor(
		@InjectRepository(Matchmaking)
		private matchmakingRepository: Repository<Matchmaking>,
		@Inject(forwardRef(() => EventsGateway))
		private eventsGateway: EventsGateway,
	) {
		this.startMatchmakingLoop();
	}

	private startMatchmakingLoop() {
		setInterval(() => {
			this.runMatchmakingLogic();
		}, this.matchmakingInterval);
	}

	private async runMatchmakingLogic() {
		//console.log('runMatchmakingLogic...!');

		// Fetch active matchmaking entries from the database
		const activeQueues = await this.matchmakingRepository.find({
			where: { isActive: true },
			relations: ['user'],
		});

		//console.log('Active queues:', activeQueues.length);

		if (activeQueues.length >= 2) {
			//console.log('Possible Match Found!\nQueue: ', activeQueues);

			// Sort the queue by joinedAt to get the longest waiting users
			activeQueues.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

			// Get the first two users from the sorted queue
			const playerOne = activeQueues[0];
			const playerTwo = activeQueues[1];

			//console.log('playerOne: ', playerOne);
			//console.log('playerTwo: ', playerTwo);

			// Notify the two users via WebSocket that they've been matched
			this.eventsGateway.server
				.to(`user_${playerOne.user.id}`)
				.emit('match-found', { opponentName: playerTwo.user.name });
			this.eventsGateway.server
				.to(`user_${playerTwo.user.id}`)
				.emit('match-found', { opponentName: playerOne.user.name });
		}
	}

	//can be null doesnt throw.
	async findQueueWithId(userId: string): Promise<Matchmaking | null> {
		const activeQueueEntry = await this.matchmakingRepository.findOne({
			where: { user: { id: userId } },
			relations: ['user'],
		});
		if (!activeQueueEntry) return null;
		return activeQueueEntry;
	}

	//can be null doesnt throw.
	async findMyQueue(user: User): Promise<Matchmaking | null> {
		const activeQueueEntry = await this.matchmakingRepository.findOne({
			where: { user: { id: user.id } },
			relations: ['user'],
		});
		if (!activeQueueEntry) return null;
		return activeQueueEntry;
	}

	async saveQueue(queue: Matchmaking): Promise<Matchmaking> {
		return await this.matchmakingRepository.save(queue);
	}

	async joinQueue(user: User): Promise<Matchmaking> {
		// Check if the user is already in the queue
		const existingEntry = await this.findMyQueue(user);
		if (existingEntry) {
			throw new Error('User is already in the queue');
		}
		// Create a new matchmaking queue entry
		const matchmakingEntry = this.matchmakingRepository.create({
			user: user,
			userId: user.id,
			isActive: true,
			joinedAt: new Date(),
		});
		// Save the entry to the database
		await this.matchmakingRepository.save(matchmakingEntry);
		console.log(`User ${user.name} joined the matchmaking queue`);
		this.matchmakingQueue.push(matchmakingEntry);
		return matchmakingEntry;
	}

	async leaveQueue(thisUserId: string): Promise<void> {
		try {
			const queue = await this.findQueueWithId(thisUserId);
			this.matchmakingQueue = this.matchmakingQueue.filter((u) => u.id !== thisUserId);
			if (!queue) {
				return;
			}
			await this.matchmakingRepository.remove(queue);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			} else if (error instanceof Error) {
				console.error(`Failed to leave queue: ${error.message}`, error.stack);
				throw new InternalServerErrorException(`Failed to leave queue: ${error.message}`);
			} else {
				console.error('An unknown error occurred', error);
				throw new InternalServerErrorException('An unknown error occurred');
			}
		}
	}

	async updateGame(game: Game): Promise<Game> {
		try {
			return this.matchmakingRepository.save(game);
		} catch (error) {
			if (error instanceof Error) {
				console.error(`Failed to update game: ${error.message}`, error.stack);
				throw new InternalServerErrorException(`Failed to update game: ${error.message}`);
			} else {
				console.error('An unknown error occurred', error);
				throw new InternalServerErrorException('An unknown error occurred during game update');
			}
		}
	}

	//########################Debug#############################

	async getAll() {
		return await this.matchmakingRepository.find({ relations: ['user'] });
	}

	async deleteAll(): Promise<void> {
		const queues = await this.matchmakingRepository.find();
		await this.matchmakingRepository.remove(queues);
	}
}
