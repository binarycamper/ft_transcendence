import '../Game/Game.css';
import { useEffect, useMemo, useState } from 'react';
import { useLoaderData, useParams } from 'react-router-dom';
import { ErrorPage } from '../../pages/Error.page';
import { gameSocket as socket } from '../../services/socket';
import useKeyHook from '../../hooks/useKeyHook';
import useTitle from '../../hooks/useTitle';

// TODO take interface from backend
type IPongGameSettings = any;
type IPongGameState = any;

interface Props {
	gameSettings: IPongGameSettings;
	gameState: IPongGameState;
}

export function PongGame({ gameSettings, gameState }: Props) {
	const { aspectRatio, ballWidth, paddleGap, paddleHeight, paddleWidth, wallHeight } = gameSettings;
	const canvasAspectRatio = useMemo(() => aspectRatio.x / aspectRatio.y, [aspectRatio]);

	useTitle('Server Side Pong');

	const [state, setState] = useState(gameState);
	useKeyHook();

	const { id } = useParams();
	useEffect(() => {
		socket.emit('page-reload', id);
		socket.emit('join-room', id);

		return () => {
			socket.emit('leave-room', id);
		};
	}, [id]);

	useEffect(() => {
		socket.on('update-game-state', (state) => {
			setState(state);
		});

		return () => {
			socket.off('update-game-state');
		};
	}, []);

	if (state.gameOver) return <div>GAME OVER</div>;
	return (
		<>
			<div
				className="game-container"
				style={
					{
						'--ball-width': `${ballWidth}%`,
						'--canvas-aspect-ratio': canvasAspectRatio,
						'--paddle-gap': `${paddleGap}%`,
						'--paddle-height': `${paddleHeight}%`,
						'--paddle-width': `${paddleWidth}%`,
						'--wall-height': `${canvasAspectRatio * wallHeight}%`,
					} as React.CSSProperties
				}
			>
				<div className="game-canvas">
					<div className="line center"></div>
					<div className="line top"></div>
					<div className="line bottom"></div>
					<div className="score">
						<div id="score-left">{state.scoreL}</div>
						<div id="score-right">{state.scoreR}</div>
					</div>
					<div
						className="ball"
						id="ball"
						style={{ left: `${state.ballPos.x}%`, top: `${state.ballPos.y}%` }}
					></div>
					<div className="paddle" id="paddle-left" style={{ top: `${state.paddleL}%` }}></div>
					<div className="paddle" id="paddle-right" style={{ top: `${state.paddleR}%` }}></div>
				</div>
			</div>
		</>
	);
}

export function PongGameWrapper() {
	// const { id } = useParams();
	const data = useLoaderData();
	// console.log(data);
	if (!data) return <ErrorPage />;

	// return <PongGame props={data} />;
	return <PongGame {...data} />;
	// return <PongGame gameSettings={data.gameSettings} gameState={data.gameState} />;
}
