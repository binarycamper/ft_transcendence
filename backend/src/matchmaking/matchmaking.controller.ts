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
	forwardRef,
	Inject,
} from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserService } from 'src/user/user.service';
import { StatusGuard } from 'src/auth/guards/status.guard';
import { GameService } from 'src/game/game.service';
import { Request, Response } from 'express';
import { EventsGateway } from 'src/events/events.gateway';
import { Game } from 'src/game/game.entity';

@Controller('matchmaking')
export class MatchmakingController {
	constructor(
		private gameService: GameService,
		private readonly matchmakingService: MatchmakingService,
		private userService: UserService,
		@Inject(forwardRef(() => EventsGateway))
		private eventsGateway: EventsGateway,
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
				return res.status(HttpStatus.OK).json({
					message: 'queue started!',
					queue,
				});
			} else {
				//TODO: frontend site should restart the queue
				if (myqueue.isActive === false) {
					myqueue.isActive = true;
					await this.matchmakingService.saveQueue(myqueue);
				}
				console.log('queue already open!');
				return res.status(HttpStatus.OK).json({
					message: 'queue already open!',
				});
			}
		} catch (error) {
			console.log('ERROR in matchmaking/join: ', error);
			return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
				message: 'New error!',
			});
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
				return res.status(HttpStatus.OK).json({ message: 'Successfully left the queue.' });
			} else {
				user.status = 'online';
				await this.userService.updateUser(user);
				return res.status(HttpStatus.OK).json({ message: 'You were not in the queue.' });
			}
		} catch (error) {
			console.error('Error leaving queue:', error);
			return res
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
			//TODO send more errror codes to handle diffrent stuff... Not only 500
			console.error('ERROR in acceptMatch:', error);
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ message: 'Error accepting match.' });
		}
	}

	@UseGuards(JwtAuthGuard)
	@Post('decline-match')
	async declineMatch(
		@Req() req: Request,
		@Res() res: Response,
		@Body('playerTwoName') opponentName: string,
	) {
		try {
			const user = await this.userService.findProfileById(req.user.id);
			const opponent = await this.userService.findProfileByName(opponentName);
			//const opponentQueue = await this.matchmakingService.findQueueWithId(opponent.id);
			//opponentQueue.isActive = true;
			//await this.matchmakingService.saveQueue(opponentQueue);
			//const myqueue = await this.matchmakingService.findQueueWithId(req.user.id);
			await this.matchmakingService.leaveQueue(req.user.id);
			const game: Game = await this.gameService.findGameById(opponent.id);
			if (game) await this.gameService.deleteGame(game);
			user.status = 'online';
			await this.userService.updateUser(user);
			this.eventsGateway.server.to(`user_${opponent.id}`).emit('matchDeclined', {});
			return res.status(HttpStatus.OK).json({ message: 'Match declined.' });
		} catch (error) {
			console.error('ERROR in declineMatch:', error);
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ message: 'Error declining match.' });
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
