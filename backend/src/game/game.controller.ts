//game.controller.ts
import { Body, Controller, Delete, Get, Req, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { UserService } from 'src/user/user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('game')
export class GameController {
	constructor(
		private readonly gameService: GameService,
		private userService: UserService,
	) {}

	@UseGuards(JwtAuthGuard)
	@Get('mygames')
	async getMyGame(@Req() req) {
		return await this.gameService.getMyGame(req.user.id);
	}

	@UseGuards(JwtAuthGuard)
	@Get('enemygame')
	async getEnemyGame(@Req() req, @Body('enemyName') enemyName: string) {
		return await this.gameService.getEnemyGame(enemyName);
	}

	//########################Debug#############################
	@Get('allgames')
	async getAllGame() {
		return await this.gameService.getAllGames();
	}

	@Delete('deleteallgames')
	async deleteAllGame() {
		return await this.gameService.deleteAllGames();
	}
}
