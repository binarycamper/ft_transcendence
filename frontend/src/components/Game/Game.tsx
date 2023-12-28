import useGameLoop from '../../hooks/useGameLoop';
import useTitle from '../../hooks/useTitle';
import './Game.css';

const aspectRatio = 4 / 3;
const ballWidth = 2.5;
const paddleGap = 2.5;
const paddleHeight = 20;
const paddleWidth = 2;
const wallHeight = 2;

export default function Game() {
	useTitle('Play Pong');
	useGameLoop({
		aspectRatio,
		ballWidth,
		paddleGap,
		paddleHeight,
		paddleWidth,
		wallHeight,
	});

	return (
		<>
			<div
				className="game-container"
				style={
					{
						'--ball-width': `${ballWidth}%`,
						'--canvas-aspect-ratio': aspectRatio,
						'--paddle-gap': `${paddleGap}%`,
						'--paddle-height': `${paddleHeight}%`,
						'--paddle-width': `${paddleWidth}%`,
						'--wall-height': `${aspectRatio * wallHeight}%`,
					} as React.CSSProperties
				}
			>
				<div className="game-canvas">
					<div className="line center"></div>
					<div className="line top"></div>
					<div className="line bottom"></div>
					<div className="score">
						<div id="score-left">0</div>
						<div id="score-right">0</div>
					</div>
					<div className="ball" id="ball"></div>
					<div className="paddle" id="paddle-left"></div>
					<div className="paddle" id="paddle-right"></div>
				</div>
			</div>
		</>
	);
}
