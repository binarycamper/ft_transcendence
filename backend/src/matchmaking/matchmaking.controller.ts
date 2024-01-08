// src/matchmaking/matchmaking.controller.ts

import {
	Controller,
	Post,
	Get,
	Delete,
	Req,
	UseGuards,
	Res,
	HttpStatus,
	Body,
} from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserService } from 'src/user/user.service';
import { StatusGuard } from 'src/auth/guards/status.guard';
import { GameService } from 'src/game/game.service';
import { Request, Response } from 'express';

@Controller('matchmaking')
export class MatchmakingController {
	constructor(
		private gameService: GameService,
		private readonly matchmakingService: MatchmakingService,
		private userService: UserService,
	) {}

	@UseGuards(JwtAuthGuard, StatusGuard)
	@Post('join')
	async joinQueue(@Req() req: Request, @Res() res: Response) {
		try {
			const user = await this.userService.findProfileById(req.user.id);
			const myqueue = await this.matchmakingService.findMyQueue(user);
			if (!myqueue) {
				const queue = await this.matchmakingService.joinQueue(user);
				user.status = 'inqueue';
				await this.userService.updateUser(user);
				res.status(HttpStatus.OK).json({
					statusCode: HttpStatus.OK,
					message: 'queue started!',
					queue,
				});
			} else {
				//TODO: frontend site should restart the queue
				res.status(HttpStatus.BAD_REQUEST).json({
					statusCode: HttpStatus.BAD_REQUEST,
					message: 'Invalid queue open!',
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
	async leaveQueue(@Req() req: Request, @Res() res: Response) {
		try {
			const queue = await this.matchmakingService.findMyQueue(req.user);
			const user = await this.userService.findProfileById(req.user.id);
			if (queue) {
				user.status = 'online';
				await this.userService.updateUser(user);
				await this.matchmakingService.leaveQueue(req.user.id);
				res.status(HttpStatus.OK).json({ message: 'Successfully left the queue.' });
			} else {
				if (user.status !== 'online') {
					user.status = 'online';
					await this.userService.updateUser(user);
				}
				// User was not in the queue, but is fine
				res.status(HttpStatus.OK).json({ message: 'You were not in the queue.' });
			}
		} catch (error) {
			console.error('Error leaving queue:', error);
			res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ message: 'Failed to leave queue due to an unexpected error.' });
		}
	}

	//TODO: dto for Body!
	@UseGuards(JwtAuthGuard)
	@Post('accept-match')
	async acceptMatch(
		@Req() req: Request,
		@Res() res: Response,
		@Body('playerTwoName') opponentName: string,
	) {
		try {
			const user = await this.userService.findProfileById(req.user.id);
			if (!user) {
				return res.status(HttpStatus.NOT_FOUND).json({ message: 'Requesting user not found.' });
			}
			const queue = await this.matchmakingService.findMyQueue(user);
			if (!queue) {
				if (user.status === 'online' || user.status === 'inqueue') {
					this.joinQueue(req, res);
					user.status = 'inqueue';
					await this.userService.updateUser(user);
					return res.status(HttpStatus.ACCEPTED).json({ message: 'Queue restarted.' }); //TODO: Frontend needs to render restarting queue!
				}
				return res
					.status(HttpStatus.FORBIDDEN)
					.json({ message: 'You are already ingame! Or Wrong User-Status.' }); //>TODO: delete  Or Wrong User-Status. before eval
			}
			queue.isActive = false;
			await this.matchmakingService.saveQueue(queue);
			const opponent = await this.userService.findProfileByName(opponentName);
			if (!opponent) {
				return res.status(HttpStatus.NOT_FOUND).json({ message: 'Opponent user not found.' });
			}

			const game = await this.gameService.createNewGame(user, opponent);
			const statusMessage = game.accepted
				? 'Both players are ready. Game can start.'
				: 'Waiting for the other player to join.';

			console.log('status: ', statusMessage);
			return res.status(HttpStatus.CREATED).json({
				message: `Match accepted. ${statusMessage}`,
				game: game,
			});
		} catch (error) {
			console.error('ERROR in acceptMatch:', error);
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ message: 'Error accepting match.' });
		}
	}

	//########################Debug#############################

	@Get('all-queues')
	async getAll() {
		return await this.matchmakingService.getAll();
	}

	@Delete('all-queues')
	async deleteAll() {
		return await this.matchmakingService.deleteAll();
	}
}
