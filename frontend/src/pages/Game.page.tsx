import { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';

const GamePage = () => {
	// Screen dimensions
	const [screenWidth, setScreenWidth] = useState(window.innerWidth);
	const [screenHeight, setScreenHeight] = useState(window.innerHeight);

	// State for user and game
	const [currentUserId, setCurrentUserId] = useState(null);
	const [currentUserName, setCurrentUserName] = useState(null);
	const [ballPosition, setBallPosition] = useState({ x: screenWidth / 2, y: screenHeight / 2 });
	const [playerScores, setPlayerScores] = useState({ player1: 0, player2: 0 });
	const [gameReady, setGameReady] = useState(false);

	// State for paddle movement
	const [leftPaddleY, setLeftPaddleY] = useState(0);
	const [rightPaddleY, setRightPaddleY] = useState(0);

	useEffect(
		() => {
			const handleResize = () => {
				setScreenWidth(window.innerWidth);
				setScreenHeight(window.innerHeight);

				// calculate the ratio of the ball's current position to the total width and height of the game area
				//const ballXRatio = ballPos.x / 1280;
				//const ballYRatio = ballPos.y / 720;

				// multiply the new dimensions of the game area by these ratios to get the new position of the ball
				//setBallPos({ x: ballXRatio * window.innerWidth, y: ballYRatio * window.innerHeight });
			};

			window.addEventListener('resize', handleResize);

			return () => {
				window.removeEventListener('resize', handleResize);
			};
		},
		[
			/*ballPos*/
		],
	);

	useEffect(() => {
		async function getCurrentUserId() {
			try {
				const response = await fetch('http://localhost:8080/user/id', { credentials: 'include' });
				if (!response.ok) {
					window.location.href = 'http://localhost:5173/';
					return;
				}
				const data = await response.json();
				setCurrentUserId(data.id);
				setCurrentUserName(data.name);
			} catch (error) {
				window.location.href = 'http://localhost:5173/';
			}
		}
		getCurrentUserId();
	}, []);

	useEffect(() => {
		socket.on('gameStart', (game) => {
			setPlayerScores({
				player1: game.scorePlayerOne,
				player2: game.scorePlayerTwo,
			});
		});
		return () => {
			socket.off('gameStart');
		};
	}, []);

	const startGame = () => {
		setGameReady(true);
		socket.emit('playerReady', {});
	};

	return (
		<div className="game-container">
			<h2>Ping Pong Game</h2>
			<div className="game-board">
				{/* Render game elements like paddles and ball based on their state */}
			</div>
			{/* User info and game control buttons */}
		</div>
	);
};

export default GamePage;
