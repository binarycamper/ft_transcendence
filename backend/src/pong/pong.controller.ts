import { Controller, Get, Param, Res } from '@nestjs/common';
import { PongService } from './pong.service';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Controller('pong')
export class PongController {
	constructor(private readonly pongService: PongService) {
		console.log('PongController instantiated');
	}

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
	async getAll(@Res() response: Response): Promise<void> {
		console.log('started!');
		try {
			const histories = await this.pongService.findAllHistory();
			console.log('Histories found:', histories); // For debugging
			response.json(histories);
		} catch (error) {
			console.error('Error fetching histories:', error);
			response.status(500).send('Error fetching histories');
		}
	}
}
