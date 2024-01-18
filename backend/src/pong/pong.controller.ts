import { Controller, Get, Param, Res } from '@nestjs/common';
import { PongService } from './pong.service';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { History } from './history.entity';

@Controller('pong')
export class PongController {
	constructor(private readonly pongService: PongService) {}

	@Get('create-cookie')
	createSessionCookie(@Res() res: Response) {
		// TODO improve this using library ? ? TODO: Subject
		const playerId = uuidv4();
		const code = this.pongService.generateRandomCode(22);
		const cookie = `${playerId}-sid=${code}`;
		return res.send({ key: 'playerID', value: cookie });
	}

	//TODO: DTO!!
	@Get(':id')
	getPongGameData(@Param('id') id: string) {
		const pongGameData = this.pongService.getPongGameById(id);
		if (!pongGameData) return null;

		const { gameSettings, gameState } = pongGameData;
		return { gameSettings, gameState };
		// return pongGameData; /* only for debugging */
	}

	//DEBUG
	@Get('all-history')
	async getAll(): Promise<History[]> {
		return this.pongService.findAllHistory();
	}
}
