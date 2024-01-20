import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { PongService } from './pong.service';
import { Response, Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { IdParamDto } from './pong.dto';

@Controller('pong')
export class PongController {
	constructor(private readonly pongService: PongService) {}

	@Get('all-history')
	async getAll() {
		//console.log('started!');
		const history = await this.pongService.findAllHistory();
		return history;
	}

	@Get('active-games')
	async getAllGames() {
		//console.log('started!');
		const games = await this.pongService.findAllGames();
		return games;
	}

	/* @UseGuards(JwtAuthGuard)
	@Get('create-cookie')
	createSessionCookie(@Res() res: Response, @Req() req: Request) {
		const playerId = req.user.id;
		const code = this.pongService.generateRandomCode(22);
		const cookie = `${playerId}-sid=${code}`;
		return res.send({ key: 'playerID', value: cookie });
	} */

	@Get(':id')
	getPongGameData(@Param() idParamDto: IdParamDto) {
		const pongGameData = this.pongService.getPongGameById(idParamDto.id);
		if (!pongGameData) return null;

		const { gameSettings, gameState } = pongGameData;
		return { gameSettings, gameState };
		// return pongGameData; /* only for debugging */
	}
}
