// matchmaking.controller.ts

import { Controller, Post, Get, Param, Delete, UseGuards } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('matchmaking')
export class MatchmakingController {
	constructor(private matchmakingService: MatchmakingService) {}

	@Get('status/:userId')
	@UseGuards(JwtAuthGuard)
	async getMatchmakingStatus(@Param('userId') userId: string) {
		const match = await this.matchmakingService.checkMatchForUser(userId);
		return match ? { matchFound: true, matchDetails: match } : { matchFound: false };
	}

	@Get('queue-time/:userId')
	@UseGuards(JwtAuthGuard)
	async getQueueTime(@Param('userId') userId: string) {
		const timeInQueue = await this.matchmakingService.getQueueTime(userId);
		return { timeInQueue };
	}

	@Get('user-status/:userId')
	@UseGuards(JwtAuthGuard)
	async getUserStatus(@Param('userId') userId: string) {
		const inQueue = await this.matchmakingService.isInQueue(userId);
		const matchStatus = await this.matchmakingService.checkMatchForUser(userId);
		return { inQueue, matchStatus };
	}

	@Get('match/:userId')
	@UseGuards(JwtAuthGuard)
	async getMatchForUser(@Param('userId') userId: string) {
		const matchStatus = await this.matchmakingService.checkMatchForUser(userId);
		return matchStatus;
	}
}
