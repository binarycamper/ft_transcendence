import { PaddleL, PaddleR, Side } from './Paddle';
import { Ball } from './Ball';
import { Score } from './Score';
import { Wall } from './Wall';

export default class PongGame {
	constructor(
		public gameURL: string,
		settings?: Partial<PongGameSettings>,
	) {
		this.gameState = new PongGameState();
		this.gameSettings = new PongGameSettings(settings);
		this.player1 = new PongPlayer(this.gameSettings.side);
		// TODO
		this.player2 = new PongPlayer('right');
		this.pongEngine = new PongGameEngine(this.gameSettings, this.gameState, [
			this.player1,
			this.player2,
		]);
	}

	gameSettings: PongGameSettings;
	gameState: PongGameState;
	player1: PongPlayer;
	player2: PongPlayer;
	pongEngine: PongGameEngine;
}

class PongGameEngine {
	constructor(settings: PongGameSettings, gameState: PongGameState, player: PongPlayer[]) {
		this.walls = new Wall(settings);

		// TODO sort player array
		this.ball = new Ball(settings, gameState, this.walls);
		this.paddleL = new PaddleL(settings, gameState, player[0], this.walls);
		this.paddleR = new PaddleR(settings, gameState, player[1], this.walls);
		this.score = new Score(gameState);
	}

	private readonly ball: Ball;
	private readonly paddleL: PaddleL;
	private readonly paddleR: PaddleR;
	private readonly score: Score;
	private readonly walls: Wall;

	previousTimestamp: number;
	update(currentTimestamp = performance.now()) {
		const delta = (currentTimestamp - this.previousTimestamp) / 1000 || 0;

		this.ball.update(delta, this.paddleL, this.paddleR);
		this.paddleL.update(delta);
		this.paddleR.update(delta);
		this.score.update(this.ball);

		this.previousTimestamp = currentTimestamp;
	}
}

export class PongGameSettings {
	constructor(settings?: Partial<PongGameSettings>) {
		Object.assign(this, settings);
		if (settings?.aspectRatio) {
			this.aspectRatio = { ...settings.aspectRatio };
		}
	}

	readonly aspectRatio = { x: 4, y: 3 };
	readonly ballAccel = 2;
	readonly ballSpeed = 60;
	readonly ballWidth = 2.5;
	readonly computer = false;
	readonly paddleGap = 2.5;
	readonly paddleHeight = 20;
	readonly paddleSpeed = 60;
	readonly paddleWidth = 2;
	readonly side: Side = 'left';
	readonly wallHeight = 2;
	readonly [key: string]: unknown;
}

export class PongGameState {
	ballPos = { x: 0, y: 0 };
	paddleL = 0;
	paddleR = 0;
	ready = false; // TODO status
	scoreL = 0;
	scoreR = 0;
}

export class PongKeyState {
	down = false;
	mod = false;
	up = false;
}

export class PongPlayer {
	constructor(side?: Side, id?: string) {
		this.id = id;
		this.side = side;
	}

	anonymous = false;
	computer = false;
	id: string;
	keyState = new PongKeyState();
	ready = false;
	side: Side;
}
