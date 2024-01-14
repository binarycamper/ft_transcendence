//Game.tsx
import { useEffect, useState } from 'react';
import useGameLoop from '../../hooks/useGameLoop';
import useTitle from '../../hooks/useTitle';
import useFetchGameData from '../game_jj/useFetchGameData';
import './Game.css';
import { useGameData } from '../game_jj/GameDataContext';
import { useUser } from '../game_jj/UserContext';

interface Player {
	id: string;
	name: string;
}

// Create contexts and provide initial values
const aspectRatio = 4 / 3;
const ballWidth = 2.5;
const paddleGap = 2.5;
const paddleHeight = 20;
const paddleWidth = 2;
const wallHeight = 2;

export default function Game() {
	const { game, setGame } = useGameData();
	const { currUser, setCurrUser } = useUser();
	const [enemy, setEnemy] = useState<Player | null>(null);
	const [isPlayerOne, setIsPlayerOne] = useState(false);

	useFetchGameData();

	useEffect(() => {
		// Once the game and currUser data is fetched and available
		if (game && currUser) {
			// Check if the current user is player one
			setIsPlayerOne(game.playerOne.id === currUser.id);

			// Determine the enemy player
			const enemyPlayer = game.playerOne.id === currUser.id ? game.playerTwo : game.playerOne;
			setEnemy(enemyPlayer);
		}
	}, [game, currUser]); // This effect should run when game or currUser changes

	const handleDebugPrint = () => {
		console.log('Debug Print:');
		console.log('Current User:', currUser);
		console.log('Game Data:', game);
		console.log('enemyPlayer Data:', enemy);
		if (isPlayerOne) console.log('You re Player 1');
	};

	useTitle('Play Pong');
	useGameLoop({
		isPlayerOne,
		aspectRatio,
		ballWidth,
		paddleGap,
		paddleHeight,
		paddleWidth,
		wallHeight,
	});

	return (
		<>
			{/* Debug Print Button - Always visible */}
			<button onClick={handleDebugPrint} className="debugPrintButton">
				Debug Print
			</button>
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
