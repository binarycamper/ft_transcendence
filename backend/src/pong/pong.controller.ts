import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { PongService } from './pong.service';
import { Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('pong')
export class PongController {
	constructor(private readonly pongService: PongService) {
		console.log('PongController instantiated');
	}

	@UseGuards(JwtAuthGuard)
	@Get('create-cookie')
	createSessionCookie(@Res() res: Response, @Req() req: Request) {
		// TODO improve this using library ? ? TODO: Subject
		const playerId = req.user.id;
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
