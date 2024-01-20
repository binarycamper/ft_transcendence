import { PaddleL, PaddleR, Side } from './Paddle';
import { Ball } from './Ball';
import { Score } from './Score';
import { Wall } from './Wall';

export default class PongGame {
	constructor(
		public gameURL: string,
		settings?: Partial<PongGameSettings>,
		computer?: boolean,
	) {
		this.gameSettings = new PongGameSettings(settings);
		this.gameState = new PongGameState();
		this.player1 = new PongPlayer(this.gameSettings.side);
		this.player2 = new PongPlayer(this.gameSettings.side === 'left' ? 'right' : 'left', computer);
		this.pongEngine = new PongGameEngine(
			this.gameSettings,
			this.gameState,
			this.player1,
			this.player2,
		);
	}

	gameSettings: PongGameSettings;
	gameState: PongGameState;
	player1: PongPlayer;
	player2: PongPlayer;
	pongEngine: PongGameEngine;
	startTime = new Date();
}

class PongGameEngine {
	constructor(
		settings: PongGameSettings,
		private gameState: PongGameState,
		private player1: PongPlayer,
		private player2: PongPlayer,
	) {
		this.walls = new Wall(settings);
		this.ball = new Ball(settings, gameState, this.walls);

		const playerL = player1.side === 'left' ? player1 : player2;
		const playerR = player1.side === 'right' ? player1 : player2;
		this.paddleL = new PaddleL(settings, gameState, playerL, this.walls);
		this.paddleR = new PaddleR(settings, gameState, playerR, this.walls);

		this.score = new Score(gameState, this.ball, this.paddleL, this.paddleR);
	}

	private readonly timeToDisconnect = 30_000;
	private readonly ball: Ball;
	private readonly paddleL: PaddleL;
	private readonly paddleR: PaddleR;
	private readonly score: Score;
	private readonly walls: Wall;

	previousTimestamp: number;
	update(currentTimestamp = performance.now()) {
		if (this.gameState.status === 'running') {
			const delta = (currentTimestamp - this.previousTimestamp) / 1000 || 0;

			this.ball.update(delta, this.paddleL, this.paddleR);
			this.paddleL.update(delta, this.ball);
			this.paddleR.update(delta, this.ball);
			this.score.update();
		} else if (this.gameState.status === 'paused') {
			if (this.player1.isConnected && this.player2.isConnected) {
				this.gameState.status = 'running';
			} else if (!this.player1.isConnected) {
				if (currentTimestamp - this.player1.timeStamp > this.timeToDisconnect) {
					this.gameState.winnerId = this.player2.id;
					this.gameState.status = 'finished';
				}
			} else if (!this.player2.isConnected) {
				if (currentTimestamp - this.player2.timeStamp > this.timeToDisconnect) {
					this.gameState.winnerId = this.player1.id;
					this.gameState.status = 'finished';
				}
			}
		}
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
	scoreL = 0;
	scoreR = 0;
	status: PongGameStatus = 'pending';
	winnerId: string;
}

type PongGameStatus = 'finished' | 'paused' | 'pending' | 'running';

export class PongKeyState {
	down = false;
	mod = false;
	up = false;
}

export class PongPlayer {
	constructor(
		readonly side: Side,
		readonly computer = false,
	) {
		if (this.computer) {
			this.isConnected = true;
			this.isReady = true;
		} else {
			this.keyState = new PongKeyState();
		}
	}

	id = '';
	isConnected = false;
	isReady = false;
	keyState: PongKeyState;
	// status = '';
	timeStamp = 0;
}
