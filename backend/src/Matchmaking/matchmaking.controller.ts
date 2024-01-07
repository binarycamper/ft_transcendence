// src/matchmaking/matchmaking.controller.ts

import {
	Controller,
	Post,
	Get,
	Delete,
	Param,
	Req,
	UseGuards,
	Res,
	HttpStatus,
	NotFoundException,
} from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserService } from 'src/user/user.service';
import { error } from 'console';
import { StatusGuard } from 'src/auth/guards/status.guard';

@Controller('matchmaking')
export class MatchmakingController {
	constructor(
		private readonly matchmakingService: MatchmakingService,
		private userService: UserService,
	) {}

	@UseGuards(JwtAuthGuard, StatusGuard)
	@Post('join')
	async joinQueue(@Req() req, @Res() res) {
		try {
			const user = await this.userService.findProfileById(req.user.id);
			const myqueue = await this.matchmakingService.findMyQueue(user);
			if (!myqueue) {
				const queue = await this.matchmakingService.joinQueue(user);
				res.status(HttpStatus.OK).json({
					statusCode: HttpStatus.OK,
					message: 'queue started!',
					queue,
				});
			} else {
				res.status(HttpStatus.BAD_REQUEST).json({
					statusCode: HttpStatus.BAD_REQUEST,
					message: 'Invalid queue!',
				});
			}
		} catch (error) {
			console.log('ERROR in matchmaking/join: ', error);
		}
	}

	@UseGuards(JwtAuthGuard)
	@Get('queue')
	async viewQueue() {
		return await this.matchmakingService.viewQueue();
	}

	@UseGuards(JwtAuthGuard)
	@Post('leave')
	async leaveQueue(@Req() req, @Res() res) {
		try {
			await this.matchmakingService.leaveQueue(req.user.id);
			res.status(HttpStatus.OK).json({ message: 'Successfully left the queue.' });
		} catch (error) {
			if (error instanceof NotFoundException) {
				res.status(HttpStatus.NOT_FOUND).json({ message: error.message });
			} else {
				res
					.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.json({ message: 'Failed to leave queue due to an unexpected error.' });
				console.error('Error leaving queue:', error);
			}
		}
	}

	//########################Debug#############################

	@Get('getAll')
	async getAll() {
		return await this.matchmakingService.getAll();
	}
}
