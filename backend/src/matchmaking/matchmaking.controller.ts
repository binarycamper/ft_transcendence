import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('matchmaking')
export class MatchmakingController {
	constructor(private matchmakingService: MatchmakingService) {}

	@Get('status')
	@UseGuards(JwtAuthGuard)
	async getMatchmakingStatus(@Req() req: Request) {
		const userId = req.user.id;
		const match = await this.matchmakingService.checkMatchForUser(userId);
		return match ? { matchFound: true, matchDetails: match } : { matchFound: false };
	}

	@Get('queue-time')
	@UseGuards(JwtAuthGuard)
	getQueueTime(@Req() req: Request) {
		const userId = req.user.id;
		const timeInQueue = this.matchmakingService.getQueueTime(userId);
		return { timeInQueue };
	}

	@Get('user-status')
	@UseGuards(JwtAuthGuard)
	async getUserStatus(@Req() req: Request) {
		const userId = req.user.id;
		const inQueue = this.matchmakingService.isInQueue(userId);
		const matchStatus = await this.matchmakingService.checkMatchForUser(userId);
		return { inQueue, matchStatus };
	}

	@Get('match')
	@UseGuards(JwtAuthGuard)
	async getMatchForUser(@Req() req: Request) {
		const userId = req.user.id;
		const matchStatus = await this.matchmakingService.checkMatchForUser(userId);
		return matchStatus;
	}
}
