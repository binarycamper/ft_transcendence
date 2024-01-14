import { useEffect, useRef } from 'react';
import useKeyHook from './useKeyHook';
import createBall from '../components/Game/Ball';
import createPaddle from '../components/Game/Paddle';
import createScore from '../components/Game/Score';
import createWall from '../components/Game/Wall';

const keyMapL = {
	up: 'KeyW',
	down: 'KeyS',
	mod: 'ShiftLeft',
};

const keyMapR = {
	up: 'ArrowUp',
	down: 'ArrowDown',
	mod: 'ShiftRight',
};

type Props = {
	isPlayerOne: boolean;
	aspectRatio: number;
	ballAccel?: number;
	ballSpeed?: number;
	ballWidth: number;
	paddleGap: number;
	paddleHeight: number;
	paddleSpeed?: number;
	paddleWidth: number;
	wallHeight: number;
};

export default function useGameLoop(props: Props) {
	const { isPlayerOne, ...otherProps } = props;
	const keyStateRef = useRef(useKeyHook());
	const requestRef = useRef(0);
	// const intervalRef = useRef(0);

	useEffect(() => {
		const {
			aspectRatio,
			ballAccel = 2,
			ballSpeed = 60,
			ballWidth,
			paddleGap,
			paddleHeight,
			paddleSpeed = 60,
			paddleWidth,
			wallHeight,
		} = props;

		const keyState = keyStateRef.current;

		const walls = createWall(aspectRatio * wallHeight);
		const score = createScore();
		const ball = createBall({ aspectRatio, ballAccel, ballSpeed, ballWidth, walls });
		const lpaddle = createPaddle({
			keyMap: keyMapL,
			keyState,
			paddleGap,
			paddleHeight,
			paddleSpeed,
			paddleWidth,
			side: 'left',
			walls,
		});
		const rpaddle = createPaddle({
			keyMap: keyMapR,
			keyState,
			paddleGap,
			paddleHeight,
			paddleSpeed,
			paddleWidth,
			side: 'right',
			walls,
		});

		let lastTime: number;
		function update(thisTime: number) {
			const delta = (thisTime - lastTime) / 1000 || 0;
			// const delta = 16.7 / 1000; /* for debugging */
			if (isPlayerOne) {
				lpaddle.update(delta, ball); // Player one controls the left paddle
			} else {
				rpaddle.update(delta, ball); // Player two controls the right paddle
			}
			/* only for debugging */
			if (keyState.NumpadAdd) ball.speed += 1;
			if (keyState.NumpadSubtract) ball.speed -= 1;

			ball.update({ delta, lpaddle, rpaddle });
			lpaddle.update(delta, ball);
			rpaddle.update(delta, ball);
			score.update(ball);

			lastTime = thisTime;
			requestRef.current = requestAnimationFrame(update);
		}
		requestRef.current = requestAnimationFrame(update);
		// intervalRef.current = setInterval(update, 16);

		return () => {
			cancelAnimationFrame(requestRef.current);
			// clearInterval(intervalRef.current);
		};
	}, [props, isPlayerOne]);
}
