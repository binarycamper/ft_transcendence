import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import '../css/game.css';

// Game arena dimensions
const gameWidth = 1200;
const gameHeight = 800;

const GamePage = () => {
	const playerAvatarStyle = (player) => ({
		backgroundImage: `url('https://source.unsplash.com/featured/?${player}')`,
	});
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
			const key = e.key.toLowerCase();
			// Check for 'w', 'a', 's', 'd' regardless of caps
			if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
				console.log(`${e.key.toUpperCase()} pressed`); // Log in uppercase for consistency
				socket.emit('keyHook', { key: key });
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [gameReady, oppoReady]);

	return (
		<div className="gameContainer" style={{ width: `${gameWidth}px`, height: `${gameHeight}px` }}>
			<h1 className="gameHeader">Ping Pong Game</h1>
			<div className="scoreboard">
				<div className="player-info">
					<div className="player-avatar" style={playerAvatarStyle('player1')}></div>
					<span>
						{userName} (Player 1): {playerScores.player1}
					</span>
				</div>
				<div className="player-info">
					<div className="player-avatar" style={playerAvatarStyle('player2')}></div>
					<span>Opponent (Player 2): {playerScores.player2}</span>
				</div>
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
