// matchmaking.service.ts
import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Match } from './matchmaking.entity';

@Injectable()
export class MatchmakingService {
	public queue: string[] = [];
	private queueEntryTimes: Map<string, Date> = new Map();
	private matchProposals = new Map<
		number,
		{ playerOneAccepted?: boolean; playerTwoAccepted?: boolean; count: number; completed: boolean }
	>();

	constructor(
		private readonly userService: UserService,
		@InjectRepository(Match)
		private matchRepository: Repository<Match>,
	) {}

	async addToQueue(userId: string): Promise<Match | null> {
		const user = await this.userService.findProfileById(userId);
		if (!user) {
			throw new Error('User not found');
		}

		if (this.queue.includes(userId)) {
			return null;
		}

		this.queue.push(userId);
		this.queueEntryTimes.set(userId, new Date());
		console.log(`User ${userId} added to queue`);
		console.log(`Current queue: `, this.queue);

		if (this.queue.length >= 2) {
			return await this.tryCreateMatch();
		}

		return null;
	}

	private async tryCreateMatch(): Promise<Match | null> {
		const playerOneId = this.queue[0];
		const playerTwoId = this.queue[1];

		if (playerOneId && playerTwoId && playerOneId !== playerTwoId) {
			const match = await this.createMatch(playerOneId, playerTwoId);
			return match;
		}

		return null;
	}

	private async createMatch(playerOneId: string, playerTwoId: string): Promise<Match> {
		const match = this.matchRepository.create({
			playerOne: await this.userService.findProfileById(playerOneId),
			playerTwo: await this.userService.findProfileById(playerTwoId),
			isCompleted: false,
			startTime: new Date(),
		});

		const savedMatch = await this.matchRepository.save(match);
		this.matchProposals.set(savedMatch.id, {
			playerOneAccepted: false,
			playerTwoAccepted: false,
			count: 0,
			completed: false,
		});
		return savedMatch;
	}

	async checkMatchForUser(userId: string): Promise<{ inMatch: boolean; matchDetails?: Match }> {
		const activeMatch = await this.matchRepository
			.createQueryBuilder('match')
			.leftJoinAndSelect('match.playerOne', 'playerOne')
			.leftJoinAndSelect('match.playerTwo', 'playerTwo')
			.where('match.isCompleted = :isCompleted', { isCompleted: false })
			.andWhere(
				new Brackets((qb) => {
					qb.where('playerOne.id = :userId', { userId }).orWhere('playerTwo.id = :userId', {
						userId,
					});
				}),
			)
			.getOne();

		if (activeMatch) {
			return { inMatch: true, matchDetails: activeMatch };
		} else {
			return { inMatch: false };
		}
	}

	async checkMatchResponses(
		matchId: number,
	): Promise<{ accepted: boolean; rematchPlayerId?: string }> {
		const proposal = this.matchProposals.get(matchId);
		console.log(`Checking responses for matchId ${matchId}, proposal: `, proposal);
		if (!proposal) {
			return { accepted: false };
		}

		const match = await this.matchRepository.findOne({
			where: { id: matchId },
			relations: ['playerOne', 'playerTwo'],
		});
		if (!match) {
			console.error('Match not found for matchId:', matchId);
			return { accepted: false };
		}

		if (proposal.playerOneAccepted === undefined && proposal.playerTwoAccepted === undefined) {
			// Beide Spieler haben nicht geantwortet
			this.removeFromQueue(match.playerOne.id);
			this.removeFromQueue(match.playerTwo.id);
			this.matchProposals.delete(matchId);
			await this.deleteMatch(matchId);
			return { accepted: false };
		} else {
			// Wenn einer der Spieler geantwortet hat
			if (proposal.playerOneAccepted || proposal.playerTwoAccepted) {
				let stayingPlayerId = proposal.playerOneAccepted ? match.playerOne.id : match.playerTwo.id;
				let leavingPlayerId = proposal.playerOneAccepted ? match.playerTwo.id : match.playerOne.id;
				this.removeFromQueue(leavingPlayerId);
				this.matchProposals.delete(matchId);
				await this.deleteMatch(matchId);
				return { accepted: false, rematchPlayerId: stayingPlayerId };
			} else {
				// Beide Spieler haben abgelehnt
				this.removeFromQueue(match.playerOne.id);
				this.removeFromQueue(match.playerTwo.id);
				this.matchProposals.delete(matchId);
				await this.deleteMatch(matchId);
				return { accepted: false };
			}
		}
	}

	async removeFromQueue(userId: string): Promise<void> {
		console.log(`Removing user ${userId} from queue`);
		const index = this.queue.indexOf(userId);
		if (index !== -1) {
			this.queue.splice(index, 1);
		}
		this.queueEntryTimes.delete(userId);
	}

	async deleteMatch(matchId: number): Promise<void> {
		await this.matchRepository.delete({ id: matchId });
	}

	async handleMatchResponse(
		matchId: number,
		userId: string,
		accept: boolean,
	): Promise<{
		matchStarted: boolean;
		playerOneId?: string;
		playerTwoId?: string;
		rematchPlayerId?: string;
	}> {
		if (!this.matchProposals.has(matchId)) {
			console.error('Match proposal not found for matchId:', matchId);
			return { matchStarted: false };
		}

		const proposal = this.matchProposals.get(matchId);

		const match = await this.matchRepository.findOne({
			where: { id: matchId },
			relations: ['playerOne', 'playerTwo'],
		});
		if (!match) {
			console.error('Match not found for matchId:', matchId);
			return;
		}

		// Aktualisieren Sie das Proposal-Objekt
		if (match.playerOne.id === userId) {
			proposal.playerOneAccepted = accept;
		} else if (match.playerTwo.id === userId) {
			proposal.playerTwoAccepted = accept;
		}
		proposal.count = (proposal.count || 0) + 1;
		proposal.completed = proposal.count === 2;

		this.matchProposals.set(matchId, proposal);

		if (proposal.completed) {
			if (proposal.playerOneAccepted !== undefined && proposal.playerTwoAccepted !== undefined) {
				if (proposal.playerOneAccepted && proposal.playerTwoAccepted) {
					// Beide Spieler haben das Match akzeptiert
					console.log('Both players accepted the match');
					console.log(`Final response from handleMatchResponse: `, {
						matchStarted: true,
						playerOneId: match.playerOne.id,
						playerTwoId: match.playerTwo.id,
					});
					return {
						matchStarted: true,
						playerOneId: match.playerOne.id,
						playerTwoId: match.playerTwo.id,
					};
				} else if (!proposal.playerOneAccepted && !proposal.playerTwoAccepted) {
					// Beide Spieler haben das Match abgelehnt
					console.log('Both players rejected the match');
					return { matchStarted: false };
				} else {
					// Nur ein Spieler hat akzeptiert, der andere bleibt in der Queue
					console.log('One player accepted, the other rejected');
					let acceptedPlayerId = proposal.playerOneAccepted
						? match.playerOne.id
						: match.playerTwo.id;

					console.log(`Final response from handleMatchResponse: `, {
						matchStarted: false,
						playerOneId: match.playerOne.id,
						playerTwoId: match.playerTwo.id,
					});
					return { matchStarted: false, rematchPlayerId: acceptedPlayerId };
				}
			}
		}
		return { matchStarted: false };
	}

	async getQueueTime(userId: string): Promise<number> {
		const entryTime = this.queueEntryTimes.get(userId);
		if (!entryTime) {
			return 0;
		}
		return Math.floor((new Date().getTime() - entryTime.getTime()) / 1000);
	}

	async isInQueue(userId: string): Promise<boolean> {
		return this.queue.includes(userId);
	}
}
