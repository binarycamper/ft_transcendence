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
		this.computer = player.computer;
		this.keyState = player.keyState;
		this.paddleGap = settings.paddleGap;
		this.paddleHeight = settings.paddleHeight;
		this.paddleSpeed = settings.paddleSpeed;
		this.paddleWidth = settings.paddleWidth;
		this.reset();
	}

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
		const centerAlignment = 50 - this.paddleHeight / 2;
		this.top = centerAlignment;
	}

	update(delta: number, ball?: Ball) {
		return this.updatePlayer(delta);
		// return this.computer ? this.updateComputer(delta, ball) : this.updatePlayer(delta);
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
