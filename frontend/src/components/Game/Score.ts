import { Ball } from './Ball';

type Score = {
	leftScore: number;
	rightScore: number;
	update(ball: Ball): void;
};

export default function createScore(): Score {
	const leftScoreRef = document.getElementById('score-left')!;
	const rightScoreRef = document.getElementById('score-right')!;
	const OFFSET = 20;

	return {
		get leftScore() {
			return parseInt(leftScoreRef.textContent!);
		},
		set leftScore(value) {
			leftScoreRef.textContent = String(value);
		},
		get rightScore() {
			return parseInt(rightScoreRef.textContent!);
		},
		set rightScore(value) {
			rightScoreRef.textContent = String(value);
		},

		update(ball: Ball) {
			if (ball.right < 0 - OFFSET) {
				this.rightScore += 1;
			} else if (ball.left > 100 + OFFSET) {
				this.leftScore += 1;
			} else return;
			ball.reset();
		},
	};
}
