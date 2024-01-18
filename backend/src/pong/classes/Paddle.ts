import { PongGameSettings, PongGameState, PongKeyState, PongPlayer } from './PongGame';
import { Ball } from './Ball';
import { Wall } from './Wall';

abstract class Paddle {
	constructor(
		readonly side: Side,
		settings: PongGameSettings,
		protected gameState: PongGameState,
		readonly player: PongPlayer,
		readonly walls: Wall,
	) {
		this.centerAlignment = 50 - settings.paddleHeight / 2;
		this.computer = player.computer;
		this.keyState = player.keyState;
		this.paddleGap = settings.paddleGap;
		this.paddleHeight = settings.paddleHeight;
		this.paddleSpeed = settings.paddleSpeed;
		this.paddleWidth = settings.paddleWidth;
		this.reset();

		if (this.computer) {
			this.update = (delta: number, ball: Ball) => this.updateComputer(delta, ball);
		} else {
			this.update = (delta: number) => this.updatePlayer(delta);
		}
	}

	readonly centerAlignment: number;
	readonly computer: boolean;
	readonly keyState: PongKeyState;
	readonly paddleGap: number;
	readonly paddleHeight: number;
	readonly paddleSpeed: number;
	readonly paddleWidth: number;

	abstract get top(): number;
	abstract set top(value);
	get bottom() {
		return this.top + this.paddleHeight;
	}
	set bottom(value) {
		if (value > this.walls.lower.limit) value = this.walls.lower.limit;
		this.top = value - this.paddleHeight;
	}
	get height() {
		return this.paddleHeight;
	}
	get width() {
		return this.paddleWidth;
	}

	move(velocity: number) {
		if (velocity < 0) {
			if (this.top > this.walls.upper.limit)
				this.top = Math.max(this.top + velocity, this.walls.upper.limit);
		} else if (velocity > 0) {
			if (this.bottom < this.walls.lower.limit)
				this.bottom = Math.min(this.bottom + velocity, this.walls.lower.limit);
		}
	}

	reset() {
		this.top = this.centerAlignment;
	}

	update: (delta: number, ball?: Ball) => void;
	/* { return this.computer ? this.updateComputer(delta, ball) : this.updatePlayer(delta); } */

	private updateComputer(delta: number, ball: Ball) {
		if (
			(this.side === 'left' && ball.dir.x > 0) ||
			(this.side === 'right' && ball.dir.x < 0) ||
			ball.right < 0 ||
			ball.left > 100
		) {
			const d = this.centerAlignment - this.top;
			const speed = Math.abs(d) < this.paddleSpeed * delta ? Math.abs(d) : this.paddleSpeed / 2;
			return this.move((d < 0 ? -speed : speed) * delta);
		}
		const ballCenter = ball.top + ball.diam.y / 2;
		const d = ballCenter - (this.top + this.paddleHeight / 2);
		const speed = Math.abs(d) < this.paddleSpeed * delta ? Math.abs(d) : this.paddleSpeed;
		return this.move((d < 0 ? -speed : speed) * delta);
	}

	private updatePlayer(delta: number) {
		const speed = this.keyState.mod ? this.paddleSpeed / 2 : this.paddleSpeed;
		if (this.keyState.up) this.move(-speed * delta);
		if (this.keyState.down) this.move(speed * delta);
	}
}

export class PaddleL extends Paddle {
	constructor(
		settings: PongGameSettings,
		gameState: PongGameState,
		player: PongPlayer,
		walls: Wall,
	) {
		super('left', settings, gameState, player, walls);
	}

	get top() {
		return this.gameState.paddleL;
	}
	set top(value) {
		if (value < this.walls.upper.limit) value = this.walls.upper.limit;
		if (value > this.walls.lower.limit - this.paddleHeight)
			value = this.walls.lower.limit - this.paddleHeight;
		this.gameState.paddleL = value;
	}
	get left() {
		return this.paddleGap;
	}
	get right() {
		return this.paddleGap + this.paddleWidth;
	}
	get line() {
		return { a: { x: this.right, y: this.top }, b: { x: this.right, y: this.bottom } };
	}
}

export class PaddleR extends Paddle {
	constructor(
		settings: PongGameSettings,
		gameState: PongGameState,
		player: PongPlayer,
		walls: Wall,
	) {
		super('right', settings, gameState, player, walls);
	}

	get top() {
		return this.gameState.paddleR;
	}
	set top(value) {
		if (value < this.walls.upper.limit) value = this.walls.upper.limit;
		if (value > this.walls.lower.limit - this.paddleHeight)
			value = this.walls.lower.limit - this.paddleHeight;
		this.gameState.paddleR = value;
	}
	get left() {
		return 100 - this.paddleGap - this.paddleWidth;
	}
	get right() {
		return 100 - this.paddleGap;
	}
	get line() {
		return { a: { x: this.left, y: this.top }, b: { x: this.left, y: this.bottom } };
	}
}

export type Side = 'left' | 'right';
