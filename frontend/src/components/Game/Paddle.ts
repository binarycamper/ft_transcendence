//Paddle.ts
import { KeyMap, KeyState } from '../../hooks/useKeyHook';
import type { Line } from './intersection';
import { Ball } from './Ball';
import { Wall } from './Wall';

export type Paddle = {
	bottom: number;
	left: number;
	line: Line;
	right: number;
	top: number;
	readonly height: number;
	readonly width: number;
	move(delta: number, velocity: number): void;
	update(delta: number, ball: Ball): void;
	update(delta: number): void;
};

type Props = {
	// computer?: boolean;
	keyMap?: KeyMap;
	keyState?: KeyState;
	paddleGap: number;
	paddleHeight: number;
	paddleSpeed: number;
	paddleWidth: number;
	side: 'left' | 'right';
	walls: Wall;
};

export default function createPaddle({
	// computer,
	keyMap,
	keyState,
	paddleGap,
	paddleHeight,
	paddleSpeed,
	paddleWidth,
	side,
	walls,
}: Props): Paddle {
	const paddleRef = document.getElementById(`paddle-${side}`)!;
	const paddleCenter = 50 - paddleHeight / 2;

	const paddlePrototype = {
		get top() {
			return parseFloat(paddleRef.style.top);
		},
		set top(value) {
			if (value < walls.upper.limit) value = walls.upper.limit;
			if (value > walls.lower.limit - paddleHeight) value = walls.lower.limit - paddleHeight;
			paddleRef.style.setProperty('top', `${value}%`);
		},
		get bottom() {
			return this.top + paddleHeight;
		},
		set bottom(value) {
			if (value > walls.lower.limit) value = walls.lower.limit;
			this.top = value - paddleHeight;
		},
		get height() {
			return paddleHeight;
		},
		get width() {
			return paddleWidth;
		},

		move(velocity: number) {
			if (velocity < 0) {
				if (this.top > walls.upper.limit)
					this.top = Math.max(this.top + velocity, walls.upper.limit);
			} else if (velocity > 0) {
				if (this.bottom < walls.lower.limit)
					this.bottom = Math.min(this.bottom + velocity, walls.lower.limit);
			}
		},

		update: function updateComputer(delta: number, ball: Ball) {
			if (
				(side === 'right' && ball.dir.x < 0) ||
				(side === 'left' && ball.dir.x > 0) ||
				ball.right < 0 ||
				ball.left > 100
			) {
				return void computerMoveCenter(delta);
			}
			const ballDiam = ball.bottom - ball.top;
			const ballCenter = ball.top + ballDiam / 2;
			const d = ballCenter - (this.top + paddleHeight / 2);
			const speed = Math.abs(d) < paddleSpeed * delta ? Math.abs(d) : paddleSpeed;
			this.move((d < 0 ? -speed : speed) * delta);
		},
	};

	if (keyMap && keyState) {
		paddlePrototype.update = function updatePlayer(delta: number) {
			const speed = keyState[keyMap.mod] ? paddleSpeed / 2 : paddleSpeed;
			if (keyState[keyMap.up]) paddlePrototype.move(-speed * delta);
			if (keyState[keyMap.down]) paddlePrototype.move(speed * delta);
		};
	}

	/* auxiliary functions */
	function computerMoveCenter(delta: number) {
		const d = paddleCenter - paddlePrototype.top;
		const speed = Math.abs(d) < paddleSpeed * delta ? Math.abs(d) : paddleSpeed / 2;
		paddlePrototype.move((d < 0 ? -speed : speed) * delta);
	}

	paddlePrototype.top = paddleCenter;

	if (side === 'left') {
		const leftPaddle = Object.create(paddlePrototype, {
			left: {
				get() {
					return paddleGap;
				},
			},
			right: {
				get() {
					return paddleGap + paddleWidth;
				},
			},
			line: {
				get() {
					return { start: { x: this.right, y: this.top }, end: { x: this.right, y: this.bottom } };
				},
			},
		}) as Paddle;
		return leftPaddle;
	}
	if (side === 'right') {
		const rightPaddle = Object.create(paddlePrototype, {
			left: {
				get() {
					return 100 - paddleGap - paddleWidth;
				},
			},
			right: {
				get() {
					return 100 - paddleGap;
				},
			},
			line: {
				get() {
					return { start: { x: this.left, y: this.top }, end: { x: this.left, y: this.bottom } };
				},
			},
		}) as Paddle;
		return rightPaddle;
	}

	throw new Error("`side` must be either 'left' or 'right'");
}
