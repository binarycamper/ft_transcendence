import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { PongService } from './pong.service';
import { Response, Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('pong')
export class PongController {
	constructor(private readonly pongService: PongService) {}

	@Get('all-history')
	async getAll() {
		//console.log('started!');
		const history = await this.pongService.findAllHistory();
		return history;
	}

	@UseGuards(JwtAuthGuard)
	@Get('create-cookie')
	createSessionCookie(@Res() res: Response, @Req() req: Request) {
		// TODO improve this using library ? ? TODO: Subject
		console.log('create cookie');
		const playerId = req.user.id;
		const code = this.pongService.generateRandomCode(22);
		const cookie = `${playerId}-sid=${code}`;
		return res.send({ key: 'playerID', value: cookie });
	}

	@Get(':id')
	getPongGameData(@Param('id') id: string) {
		const pongGameData = this.pongService.getPongGameById(id);
		if (!pongGameData) return null;

		const { gameSettings, gameState } = pongGameData;
		return { gameSettings, gameState };
		// return pongGameData; /* only for debugging */
	}
}
