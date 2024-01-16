import findIntersection, { Line } from '../utils/intersection';
import { PaddleL, PaddleR } from './Paddle';
import { PongGameSettings, PongGameState } from './PongGame';
import { Wall } from './Wall';

export class Ball {
	constructor(
		settings: PongGameSettings,
		private gameState: PongGameState,
		readonly walls: Wall,
	) {
		/* normalize */
		this.aspectRatio = settings.aspectRatio.x / settings.aspectRatio.y;
		this.diam.x = settings.ballWidth;
		this.diam.y = settings.ballWidth * this.aspectRatio;

		this.ballAccel = settings.ballAccel;
		this.defaultSpeed = settings.ballSpeed;
		this.reset();
	}

	readonly aspectRatio: number;
	readonly ballAccel: number;
	readonly defaultSpeed: number;
	readonly diam = { x: 0, y: 0 };
	private lastDir = { x: 0, y: 0 };

	dir = { x: 0, y: 0 };
	speed: number;

	get left() {
		return this.gameState.ballPos.x;
	}
	set left(value) {
		this.gameState.ballPos.x = value;
	}
	get top() {
		return this.gameState.ballPos.y;
	}
	set top(value) {
		this.gameState.ballPos.y = value;
	}
	get right() {
		return this.left + this.diam.x;
	}
	set right(value) {
		this.left = value - this.diam.x;
	}
	get bottom() {
		return this.top + this.diam.y;
	}
	set bottom(value) {
		this.top = value - this.diam.y;
	}

	reset() {
		this.speed = this.defaultSpeed;
		this.left = 50 - this.diam.x / 2;
		this.top = 50 - this.diam.y / 2;
		do {
			this.dir = generateRandomDirection();
		} while (Math.abs(this.dir.x) < Math.cos(degToRad(72)));

		if (this.lastDir.x < 0) {
			this.dir.x = Math.abs(this.dir.x);
		} else if (this.lastDir.x > 0) {
			this.dir.x = -Math.abs(this.dir.x);
		}
		this.lastDir.x = this.dir.x;
	}

	update(delta: number, paddleL: PaddleL, paddleR: PaddleR) {
		let distance = this.speed * delta;
		let x0 = this.left;
		let y0 = this.top;
		let x1 = x0 + this.dir.x * distance;
		let y1 = y0 + this.dir.y * distance * this.aspectRatio;
		let hasHitPaddle = false;

		if (
			x1 > paddleL.right &&
			x1 + this.diam.x < paddleR.left &&
			y1 > this.walls.upper.limit &&
			y1 + this.diam.y < this.walls.lower.limit
		) {
			/* collision not possible */
			this.left = x1;
			this.top = y1;
			return;
		}

		for (;;) {
			/* Wall collision */
			const wall = this.dir.y < 0 ? this.walls.upper.line : this.walls.lower.line;
			const intxnW = this.findCollision(this.pathY(x0, y0, x1, y1), wall);
			/* Paddle vertical collision */
			const line = this.computePaddleHitLine(this.dir.x < 0 ? paddleL : paddleR);
			const intxnP = this.findCollision(this.pathX(x0, y0, x1, y1), line);

			if (intxnW !== null && (intxnP === null || intxnW.d < intxnP.d)) {
				/* console.log('Wall collision'); */
				this.dir.y *= -1;
				x0 = intxnW.x;
				y0 = intxnW.y - (intxnW.y > 50 ? this.diam.y : 0);

				distance -= intxnW.d;
				x1 = intxnW.x + this.dir.x * distance;
				y1 = intxnW.y - (y0 > 50 ? this.diam.y : 0) + this.dir.y * distance * this.aspectRatio;

				continue;
			}
			if (intxnP !== null) {
				/* console.log('Paddle collision'); */
				hasHitPaddle = true;
				const L = (line.b.y - line.a.y) / 2;
				const h = intxnP.y;
				const C = (h - line.a.y - L) / L;
				this.dir = { x: Math.cos(C * degToRad(80)), y: Math.sin(C * degToRad(80)) };
				if (intxnP.x > 50) this.dir.x = -Math.abs(this.dir.x);

				x0 = intxnP.x - (intxnP.x > 50 ? this.diam.x : 0);
				y0 = intxnP.y;

				distance -= intxnP.d;
				x1 = intxnP.x - (x0 > 50 ? this.diam.x : 0) + this.dir.x * distance;
				y1 = intxnP.y + this.dir.y * distance * this.aspectRatio;

				continue;
			}
			break;
		}

		// TODO improve code to avoid duplication
		/* Paddle horizontal collision */
		if (this.hasPaddleCollision(paddleL)) {
			hasHitPaddle = true;
			const center = paddleL.left + paddleL.width / 2;
			const angle = this.left + this.diam.x / 2 > center ? 60 : 120;
			this.dir = generateDirection(angle);
			if (this.top <= paddleL.top && this.bottom >= paddleL.top) {
				this.dir.y *= -1;
				y1 = paddleL.top - this.diam.y + this.dir.y * this.speed * this.aspectRatio * delta;
				y1 = Math.max(y1, this.walls.upper.limit);
				if (y1 === this.walls.upper.limit) this.dir.y *= -1;
			} else {
				y1 = paddleL.bottom + this.dir.y * this.speed * this.aspectRatio * delta;
				y1 = Math.min(y1, this.walls.lower.limit - this.diam.y);
				if (y1 === this.walls.lower.limit) this.dir.y *= -1;
			}
			x1 = this.left + this.dir.x * this.speed * delta;
		} else if (this.hasPaddleCollision(paddleR)) {
			hasHitPaddle = true;
			const center = paddleR.left + paddleR.width / 2;
			const angle = this.left + this.diam.x / 2 < center ? 120 : 60;
			this.dir = generateDirection(angle);
			if (this.top <= paddleR.top && this.bottom >= paddleR.top) {
				this.dir.y *= -1;
				y1 = paddleR.top - this.diam.y + this.dir.y * this.speed * this.aspectRatio * delta;
				y1 = Math.max(y1, this.walls.upper.limit);
				if (y1 === this.walls.upper.limit) this.dir.y *= -1;
			} else {
				y1 = paddleR.bottom + this.dir.y * this.speed * this.aspectRatio * delta;
				y1 = Math.min(y1, this.walls.lower.limit - this.diam.y);
				if (y1 === this.walls.lower.limit) this.dir.y *= -1;
			}
			x1 = this.left + this.dir.x * this.speed * delta;
		}

		if (hasHitPaddle) this.speed += this.ballAccel;

		this.left = x1;
		this.top = y1;
	}

	/* AUXILIARY FUNCTIONS */
	private computePaddleHitLine(paddle: PaddleL | PaddleR): Line {
		const paddleHitLine = paddle.line;
		paddleHitLine.a.y -= this.diam.y;
		return paddleHitLine;
	}
	private findCollision(line1: Line, line2: Line) {
		const intxn = findIntersection(line1, line2);
		if (intxn === null) return null;

		const distance = Math.sqrt(
			Math.pow(intxn.x - line1.a.x, 2) +
				Math.pow((intxn.y - line1.a.y) * (1 / this.aspectRatio), 2),
		);
		return {
			d: distance,
			x: intxn.x,
			y: intxn.y,
		};
	}
	private hasPaddleCollision(paddle: PaddleL | PaddleR) {
		return (
			this.left <= paddle.right &&
			this.right >= paddle.left &&
			this.top <= paddle.bottom &&
			this.bottom >= paddle.top
		);
	}
	private pathX(x0: number, y0: number, x1: number, y1: number): Line {
		return {
			a: { x: this.dir.x < 0 ? x0 : x0 + this.diam.x, y: y0 },
			b: { x: this.dir.x < 0 ? x1 : x1 + this.diam.x, y: y1 },
		};
	}
	private pathY(x0: number, y0: number, x1: number, y1: number): Line {
		return {
			a: { x: x0, y: this.dir.y < 0 ? y0 : y0 + this.diam.y },
			b: { x: x1, y: this.dir.y < 0 ? y1 : y1 + this.diam.y },
		};
	}
}

/* HELPER FUNCTIONS */
function generateDirection(degrees: number) {
	return { x: Math.cos(degToRad(degrees)), y: Math.sin(degToRad(degrees)) };
}

function generateRandomDirection() {
	const radians = getRandomNumberInRange(0, 2 * Math.PI);
	return { x: Math.cos(radians), y: Math.sin(radians) };
}

function getRandomNumberInRange(min: number, max: number) {
	return Math.random() * (max - min) + min;
}

function degToRad(degrees: number) {
	return degrees * (Math.PI / 180);
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
function radToDeg(radians: number) {
	return radians * (180 / Math.PI);
}
