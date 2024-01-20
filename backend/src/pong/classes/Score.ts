import { PaddleL, PaddleR } from './Paddle';
import { Ball } from './Ball';
import { PongGameState } from './PongGame';

export class Score {
	constructor(
		private gameState: PongGameState,
		private ball: Ball,
		private readonly paddleL: PaddleL,
		private readonly paddleR: PaddleR,
	) {}

	private readonly OFFSET = 20;
	private readonly POINTS = 11;

	get scoreL() {
		return this.gameState.scoreL;
	}
	set scoreL(value) {
		this.gameState.scoreL = value;
	}
	get scoreR() {
		return this.gameState.scoreR;
	}
	set scoreR(value) {
		this.gameState.scoreR = value;
	}

	update() {
		if (this.ball.right < 0 - this.OFFSET) {
			this.scoreR += 1;
		} else if (this.ball.left > 100 + this.OFFSET) {
			this.scoreL += 1;
		} else return;
		if (this.scoreL >= this.POINTS || this.scoreR >= this.POINTS) {
			this.gameState.status = 'finished';
			this.gameState.winnerId =
				this.scoreL > this.scoreR ? this.paddleL.player.id : this.paddleR.player.id;
		} else this.ball.reset();
	}
}
