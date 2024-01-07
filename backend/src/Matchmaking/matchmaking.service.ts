// src/matchmaking/matchmaking.service.ts

import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Matchmaking } from './matchmaking.entity';
import { User } from 'src/user/user.entity';
import { UserService } from 'src/user/user.service';
import { NotFoundError } from 'rxjs';

@Injectable()
export class MatchmakingService {
	constructor(
		@InjectRepository(Matchmaking)
		private matchmakingRepository: Repository<Matchmaking>,
		private userService: UserService,
	) {}

	async findMyQueue(user: User): Promise<Matchmaking | null> {
		const activeQueueEntry = await this.matchmakingRepository.findOne({
			where: { user: { id: user.id }, isActive: true },
			relations: ['user'],
		});
		if (!activeQueueEntry) return null;
		return activeQueueEntry;
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
		});
		// Save the entry to the database
		await this.matchmakingRepository.save(matchmakingEntry);
		console.log(`User ${user.name} joined the matchmaking queue`);

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
}
