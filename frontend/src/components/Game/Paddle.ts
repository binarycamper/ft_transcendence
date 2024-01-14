import { KeyMap, KeyState } from '../../hooks/useKeyHook';
import type { Line } from './intersection';
import { Ball } from './Ball';
import { Wall } from './Wall';

export type Paddle = {
	isControllable: boolean;
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
	keyMap?: KeyMap;
	keyState?: KeyState;
	paddleGap: number;
	paddleHeight: number;
	paddleSpeed: number;
	paddleWidth: number;
	side: 'left' | 'right';
	walls: Wall;
	isControllable: boolean;
};

export default function createPaddle({
	isControllable,
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

		update(delta: number) {
			// Paddle update logic for controllable paddles
			if (isControllable && keyMap && keyState) {
				const speed = keyState[keyMap.mod] ? paddleSpeed / 2 : paddleSpeed;
				if (keyState[keyMap.up]) this.move(-speed * delta);
				if (keyState[keyMap.down]) this.move(speed * delta);
			}
		},
	};

	paddlePrototype.top = paddleCenter;

	return Object.create(paddlePrototype, {
		left: {
			get() {
				return side === 'left' ? paddleGap : 100 - paddleGap - paddleWidth;
			},
		},
		right: {
			get() {
				return side === 'left' ? paddleGap + paddleWidth : 100 - paddleGap;
			},
		},
		line: {
			get() {
				return {
					start: { x: side === 'left' ? this.right : this.left, y: this.top },
					end: { x: side === 'left' ? this.right : this.left, y: this.bottom },
				};
			},
		},
	}) as Paddle;
}
