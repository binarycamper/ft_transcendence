//game.controller.ts
import { Body, Controller, Delete, Get, HttpException, Post, Req, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { GameUpdateDto } from './dto/dto';

@Controller('game')
export class GameController {
	constructor(private readonly gameService: GameService) {}

	@UseGuards(JwtAuthGuard)
	@Get('my-game')
	async getMyGame(@Req() req: Request) {
		return await this.gameService.findGameByUserId(req.user.id);
	}

	@UseGuards(JwtAuthGuard)
	@Get('opponent-game')
	async getOpponentGame(@Body('opponent-name') opponentName: string) {
		return await this.gameService.getOpponentGame(opponentName);
	}

	@UseGuards(JwtAuthGuard)
	@Post('game-mode')
	async updateGameMode(@Req() req: Request, @Body('gameMode') gameMode: boolean) {
		try {
			console.log('hwt');
			const userId = req.user.id;
			// Use your game service method to update the game mode for the user
			await this.gameService.updateGameMode(userId, gameMode);
			return { message: 'Game mode updated successfully' };
		} catch (error) {
			if (error instanceof HttpException) {
				throw error;
			}
			throw new HttpException('Internal Server Error', 500);
		}
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

	@UseGuards(JwtAuthGuard)
	@Post('update-game')
	async updateGame(@Req() req, @Body() gameUpdateDto: GameUpdateDto) {
		try {
			return await this.gameService.updateGame(gameUpdateDto, req.user.id);
		} catch (error) {
			if (error instanceof HttpException) {
				throw error;
			}
			throw new HttpException('Internal Server Error', 500);
		}
	}
}
