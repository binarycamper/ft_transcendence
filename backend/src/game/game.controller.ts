//game.controller.ts
import { Body, Controller, Delete, Get, Req, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('game')
export class GameController {
	constructor(private readonly gameService: GameService) {}

	@UseGuards(JwtAuthGuard)
	@Get('my-games')
	async getMyGame(@Req() req: Request) {
		return await this.gameService.getMyGame(req.user.id);
	}

	@UseGuards(JwtAuthGuard)
	@Get('opponent-game')
	async getOpponentGame(@Body('opponent-name') opponentName: string) {
		return await this.gameService.getOpponentGame(opponentName);
	}

	//########################Debug#############################
	@Get('all-games')
	async getAllGame() {
		return await this.gameService.getAllGames();
	}

	@Delete('all-games')
	async deleteAllGame() {
		return await this.gameService.deleteAllGames();
	}
}
