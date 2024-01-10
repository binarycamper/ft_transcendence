import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from './context/socketContext';

const GamePage = () => {
	const socket = useContext(SocketContext);

	// State for screen dimensions
	const [screenWidth, setScreenWidth] = useState(window.innerWidth);
	const [screenHeight, setScreenHeight] = useState(window.innerHeight);

	// State for user and game
	const [currentUserId, setCurrentUserId] = useState(null);
	const [currentUserName, setCurrentUserName] = useState(null);
	const [ballPosition, setBallPosition] = useState({ x: screenWidth / 2, y: screenHeight / 2 });
	const [playerScores, setPlayerScores] = useState({ player1: 0, player2: 0 });
	const [gameReady, setGameReady] = useState(false);

	// State for paddle movement
	const [isMovingUp, setIsMovingUp] = useState(false);
	const [isMovingDown, setIsMovingDown] = useState(false);
	const [leftPaddleY, setLeftPaddleY] = useState(0);
	const [rightPaddleY, setRightPaddleY] = useState(0);

	const handleKeyDown = (event) => {
		if (event.key === 'ArrowUp') {
			setIsMovingUp(true);
		} else if (event.key === 'ArrowDown') {
			setIsMovingDown(true);
		}
	};

	const handleKeyUp = (event) => {
		if (event.key === 'ArrowUp') {
			setIsMovingUp(false);
		} else if (event.key === 'ArrowDown') {
			setIsMovingDown(false);
		}
	};

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, []);

	useEffect(() => {
		const handlePaddleMovement = () => {
			if (isMovingUp) {
				setLeftPaddleY((prevY) => Math.max(prevY - 5, 0));
			}
			if (isMovingDown) {
				setLeftPaddleY((prevY) => Math.min(prevY + 5, screenHeight - 100)); // Assuming paddle height of 100
			}
		};
		const intervalId = setInterval(handlePaddleMovement, 1000 / 60); // 60 FPS
		return () => clearInterval(intervalId);
	}, [isMovingUp, isMovingDown, screenHeight]);

	useEffect(() => {
		const gameLoop = () => {
			// Update ballPosition and other game logic
		};
		const intervalId = setInterval(gameLoop, 1000 / 60); // 60 FPS
		return () => clearInterval(intervalId);
	}, [ballPosition, gameReady]);

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
	}, [socket]);

	const startGame = () => {
		setGameReady(true);
		socket.emit('playerReady', { userId: currentUserId });
	};

	return (
		<div className="game-container">
			<h2>Ping Pong Game</h2>
			<div className="game-board">
				<div className="ball" style={{ left: ballPosition.x, top: ballPosition.y }}></div>
				<div className="left-paddle" style={{ top: leftPaddleY }}></div>
				<div className="right-paddle" style={{ top: rightPaddleY }}></div>
			</div>
			<div>
				Current User: <strong>{currentUserName || 'Loading...'}</strong>
			</div>
			{!gameReady && <button onClick={startGame}>Start Game</button>}
		</div>
	);
};

export default GamePage;
