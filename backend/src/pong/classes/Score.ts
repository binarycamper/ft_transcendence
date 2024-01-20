import { Ball } from './Ball';
import { PongGameState } from './PongGame';

export class Score {
	constructor(private gameState: PongGameState) {}

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

	update(ball: Ball) {
		if (ball.right < 0 - this.OFFSET) {
			this.scoreR += 1;
		} else if (ball.left > 100 + this.OFFSET) {
			this.scoreL += 1;
		} else return;
		if (this.scoreL >= this.POINTS || this.scoreR >= this.POINTS) {
			this.gameState.gameOver = true;
		} else ball.reset();
	}
}
