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
import { UserService } from 'src/user/user.service';
import { EventsGateway } from 'src/events/events.gateway';

@Injectable()
export class MatchmakingService {
	private readonly matchmakingInterval = 10_000;
	private matchmakingQueue: Matchmaking[] = [];
	constructor(
		@InjectRepository(Matchmaking)
		private matchmakingRepository: Repository<Matchmaking>,
		private userService: UserService,
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
				.emit('matchFound', { enemyUserName: playerTwo.user.name });
			this.eventsGateway.server
				.to(`user_${playerTwo.user.id}`)
				.emit('matchFound', { enemyUserName: playerOne.user.name });
		}
	}

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
			isActive: true,
			joinedAt: new Date(),
		});
		// Save the entry to the database
		await this.matchmakingRepository.save(matchmakingEntry);
		console.log(`User ${user.name} joined the matchmaking queue`);
		this.matchmakingQueue.push(matchmakingEntry);
		return matchmakingEntry;
	}

	async viewQueue(): Promise<any> {
		// Placeholder logic to view the current matchmaking queue
		// Implement actual logic to retrieve and return queue information
		console.log(`Viewing the current matchmaking queue`);
		return { message: `Current matchmaking queue` };
	}

	async leaveQueue(userId: string): Promise<void> {
		try {
			const user = await this.userService.findProfileById(userId);
			if (!user) throw new NotFoundException(`User with ID ${userId} not found.`);

			const queue = await this.findMyQueue(user);
			if (!queue) throw new NotFoundException(`Queue entry for user with ID ${userId} not found.`);
			this.matchmakingQueue = this.matchmakingQueue.filter((u) => u.id !== user.id);
			await this.matchmakingRepository.remove(queue);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			} else {
				console.error(`Failed to leave queue: ${error.message}`, error.stack);
				throw new InternalServerErrorException(`Failed to leave queue: ${error.message}`);
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
