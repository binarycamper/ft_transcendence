import findIntersection, { Line } from './intersection';
import { Paddle } from './Paddle';
import { Wall } from './Wall';

type updateProps = {
	delta: number;
	lpaddle: Paddle;
	rpaddle: Paddle;
};

export type Ball = {
	bottom: number;
	dir: { x: number; y: number };
	left: number;
	right: number;
	speed: number;
	top: number;
	pathX(x0: number, y0: number, x1: number, y1: number): Line;
	pathY(x0: number, y0: number, x1: number, y1: number): Line;
	reset(): void;
	update({ delta, lpaddle, rpaddle }: updateProps): void;
};

type Props = {
	aspectRatio: number;
	ballAccel: number;
	ballSpeed: number;
	ballWidth: number;
	walls: Wall;
};

export default function createBall({
	aspectRatio,
	ballAccel,
	ballSpeed,
	ballWidth,
	walls,
}: Props): Ball {
	const ballRef = document.getElementById('ball')!;
	const diamX = ballWidth;
	const diamY = ballWidth * aspectRatio;

	let lastDirX = 0;

	const ball = {
		speed: ballSpeed,
		dir: { x: 0, y: 0 },

		get left() {
			return parseFloat(ballRef.style.left);
		},
		set left(value) {
			ballRef.style.setProperty('left', `${value}%`);
		},
		get top() {
			return parseFloat(ballRef.style.top);
		},
		set top(value) {
			ballRef.style.setProperty('top', `${value}%`);
		},
		get right() {
			return this.left + diamX;
		},
		set right(value) {
			this.left = value - diamX;
		},
		get bottom() {
			return this.top + diamY;
		},
		set bottom(value) {
			this.top = value - diamY;
		},

		pathX(x0: number, y0: number, x1: number, y1: number): Line {
			return {
				start: { x: this.dir.x < 0 ? x0 : x0 + diamX, y: y0 },
				end: { x: this.dir.x < 0 ? x1 : x1 + diamX, y: y1 },
			};
		},
		pathY(x0: number, y0: number, x1: number, y1: number): Line {
			return {
				start: { x: x0, y: this.dir.y < 0 ? y0 : y0 + diamY },
				end: { x: x1, y: this.dir.y < 0 ? y1 : y1 + diamY },
			};
		},

		reset() {
			this.speed = ballSpeed;
			this.left = 50 - diamX / 2;
			this.top = 50 - diamY / 2;
			do {
				this.dir = generateRandomDirection();
			} while (Math.abs(this.dir.x) < Math.cos(degToRad(72)));

			if (lastDirX < 0) {
				this.dir.x = Math.abs(this.dir.x);
			} else if (lastDirX > 0) {
				this.dir.x = -Math.abs(this.dir.x);
			}
			lastDirX = this.dir.x;
		},

		update({ delta, lpaddle, rpaddle }: updateProps) {
			let distance = this.speed * delta;
			let x0 = this.left;
			let y0 = this.top;
			let x1 = x0 + this.dir.x * distance;
			let y1 = y0 + this.dir.y * distance * aspectRatio;
			let hasHitPaddle = false;

			if (
				x1 > lpaddle.right &&
				x1 + diamX < rpaddle.left &&
				y1 > walls.upper.limit &&
				y1 + diamY < walls.lower.limit
			) {
				/* collision not possible */
				this.left = x1;
				this.top = y1;
				return;
			}

			for (;;) {
				/* Wall collision */
				const wall = this.dir.y < 0 ? walls.upper.line : walls.lower.line;
				const intxnW = findCollision(this.pathY(x0, y0, x1, y1), wall);
				/* Paddle vertical collision */
				const line = computePaddleHitLine(this.dir.x < 0 ? lpaddle : rpaddle);
				const intxnP = findCollision(this.pathX(x0, y0, x1, y1), line);

				if (intxnW !== null && (intxnP == null || intxnW.d < intxnP.d)) {
					console.log('Wall collision');
					this.dir.y *= -1;
					x0 = intxnW.x;
					y0 = intxnW.y - (intxnW.y > 50 ? diamY : 0);

					distance -= intxnW.d;
					x1 = intxnW.x + this.dir.x * distance;
					y1 = intxnW.y - (y0 > 50 ? diamY : 0) + this.dir.y * distance * aspectRatio;
					continue;
				}

				if (intxnP !== null) {
					console.log('Paddle collision');
					hasHitPaddle = true;
					const L = (line.end.y - line.start.y) / 2;
					const h = intxnP.y;
					const C = (h - line.start.y - L) / L;
					this.dir = { x: Math.cos(C * degToRad(80)), y: Math.sin(C * degToRad(80)) };
					if (intxnP.x > 50) this.dir.x = -Math.abs(this.dir.x);

					x0 = intxnP.x - (intxnP.x > 50 ? diamX : 0);
					y0 = intxnP.y;

					distance -= intxnP.d;
					x1 = intxnP.x - (x0 > 50 ? diamX : 0) + this.dir.x * distance;
					y1 = intxnP.y + this.dir.y * distance * aspectRatio;
					continue;
				}
				break;
			}

			/* Paddle horizontal collision */
			// TODO: improve to avoid duplicate code
			// test with: this.top = 5; this.dir = { x: 1, y: 0 };
			if (hasCollision(lpaddle)) {
				hasHitPaddle = true;
				const center = lpaddle.left + lpaddle.width / 2;
				if (this.left + diamX / 2 > center) {
					this.dir = generateDirection(60);
				} else {
					this.dir = generateDirection(120);
				}
				if (this.top <= lpaddle.top && this.bottom >= lpaddle.top) {
					this.dir.y *= -1;
					y1 = lpaddle.top - diamY + this.dir.y * this.speed * aspectRatio * delta;
					y1 = Math.max(y1, walls.upper.limit);
					if (y1 == walls.upper.limit) this.dir.y *= -1;
				} else {
					y1 = lpaddle.bottom + this.dir.y * this.speed * aspectRatio * delta;
					y1 = Math.min(y1, walls.lower.limit - diamY);
					if (y1 == walls.lower.limit) this.dir.y *= -1;
				}
				x1 = this.left + this.dir.x * this.speed * delta;
			} else if (hasCollision(rpaddle)) {
				hasHitPaddle = true;
				const center = rpaddle.left + rpaddle.width / 2;
				if (this.left + diamX / 2 < center) {
					this.dir = generateDirection(120);
				} else {
					this.dir = generateDirection(60);
				}
				if (this.top <= rpaddle.top && this.bottom >= rpaddle.top) {
					this.dir.y *= -1;
					y1 = rpaddle.top - diamY + this.dir.y * this.speed * aspectRatio * delta;
					y1 = Math.max(y1, walls.upper.limit);
					if (y1 == walls.upper.limit) this.dir.y *= -1;
				} else {
					y1 = rpaddle.bottom + this.dir.y * this.speed * aspectRatio * delta;
					y1 = Math.min(y1, walls.lower.limit - diamY);
					if (y1 == walls.lower.limit) this.dir.y *= -1;
				}
				x1 = this.left + this.dir.x * this.speed * delta;
			}

			if (hasHitPaddle) {
				this.speed += ballAccel;
				console.log(this.speed);
			}
			this.left = x1;
			this.top = y1;
		},
	};

	/* auxiliary functions */
	function computePaddleHitLine(paddle: Paddle): Line {
		const paddleHitLine = paddle.line;
		paddleHitLine.start.y -= diamY;
		return paddleHitLine;
	}
	function findCollision(a: Line, b: Line) {
		const intxn = findIntersection(a, b);
		if (intxn === null) return null;
		const distance = Math.sqrt(
			Math.pow(intxn.x - a.start.x, 2) + Math.pow((intxn.y - a.start.y) * (1 / aspectRatio), 2),
		);
		return {
			d: distance,
			x: intxn.x,
			y: intxn.y,
		};
	}
	function hasCollision(paddle: Paddle) {
		return (
			ball.left <= paddle.right &&
			ball.right >= paddle.left &&
			ball.top <= paddle.bottom &&
			ball.bottom >= paddle.top
		);
	}

	ball.reset();
	return ball;
}

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
