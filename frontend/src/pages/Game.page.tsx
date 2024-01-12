import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import '../css/game.css';

// Game arena dimensions
const gameWidth = 1200;
const gameHeight = 800;

const GamePage = () => {
	// User states
	const [userId, setUserId] = useState('');
	const [userName, setUserName] = useState('');

	// State for game status and scores
	const [playerScores, setPlayerScores] = useState({ player1: 0, player2: 0 });
	const [gameReady, setGameReady] = useState(false);
	const [oppoReady, setOppoReady] = useState(false);

	// Paddle and ball state

	const [leftPaddleY, setLeftPaddleY] = useState(200);
	const [rightPaddleY, setRightPaddleY] = useState(200);
	const [ballPosition, setBallPosition] = useState({ x: 300, y: 200 });

	useEffect(() => {
		async function getUserId() {
			try {
				const response = await fetch('http://localhost:8080/user/id', {
					credentials: 'include',
				});
				if (!response.ok) {
					window.location.href = 'http://localhost:5173/';
					return;
				}
				const data = await response.json();
				setUserId(data.id);
				setUserName(data.name);
			} catch (error) {
				window.location.href = 'http://localhost:5173/';
			}
		}

		async function getCurrentGameData() {
			try {
				const response = await fetch('http://localhost:8080/game/my-game', {
					credentials: 'include',
				});
				if (!response.ok) {
					return;
				}
				const data = await response.json();
				// TODO: Set your data here. You can have all the info of the game entity.
				// const game.playerOneScore = data.playerOneScore etc...
			} catch (error) {
				// Handle error
			}
		}

		getUserId();
		getCurrentGameData();
	}, []);

	useEffect(() => {
		socket.on('gameStart', (game) => {
			setPlayerScores({
				player1: game.scorePlayerOne,
				player2: game.scorePlayerTwo,
			});
			console.log('enemy sent start!');
			setOppoReady(true); // Assuming 'gameStart' means both players are ready, and the game can start
		});

		return () => {
			socket.off('gameStart');
		};
	}, []);

	const startGame = () => {
		setGameReady(true);
		socket.emit('playerReady', {});
	};

	useEffect(() => {
		const handleKeyDown = (e) => {
			console.log('pressed key ??');
			// Update paddle position based on key press
			// ...
		};

		document.addEventListener('keydown', handleKeyDown);

		if (gameReady && oppoReady) {
			// Game loop
			const updateGame = () => {
				// Update ball position and check for collisions
				// ...

				requestAnimationFrame(updateGame);
			};

			// Start the game loop
			requestAnimationFrame(updateGame);
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [gameReady, oppoReady]);

	return (
		<div className="gameContainer" style={{ width: `${gameWidth}px`, height: `${gameHeight}px` }}>
			<h1 className="gameHeader">Ping Pong Game</h1>
			<div className="scoreboard">
				{/* Render player names and scores here */}
				<span>
					{userName} (Player 1): {playerScores.player1}
				</span>
				<span>Opponent (Player 2): {playerScores.player2}</span>
			</div>
			{gameReady ? (
				<>
					<div className="paddle left" style={{ top: `${leftPaddleY}px` }} />
					<div className="paddle right" style={{ top: `${rightPaddleY}px` }} />
					<div
						className="ball"
						style={{ left: `${ballPosition.x}px`, top: `${ballPosition.y}px` }}
					/>
					{/* Optionally, render a pause button or other in-game options */}
				</>
			) : (
				<button onClick={startGame} className="readyButton">
					Ready
				</button>
			)}
		</div>
	);
};

export default GamePage;
