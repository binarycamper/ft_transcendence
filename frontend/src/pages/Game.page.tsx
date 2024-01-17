import { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';

const GamePage = () => {
	const [currentUserId, setCurrentUserId] = useState(null);
	const [currentUserName, setCurrentUserName] = useState(null);
	const [gameReady, setGameReady] = useState(false);

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
		async function getCurrentGameData() {
			try {
				const response = await fetch('http://localhost:8080/game/my-game', {
					credentials: 'include',
				});
				if (!response.ok) {
					window.location.href = 'http://localhost:5173/';
					return;
				}
				const data = await response.json();
				//TODO: Set ur data here you can have all infos of game entity. const game.playerOneScore = data.playerOneScore etc...
			} catch (error) {
				window.location.href = 'http://localhost:5173/';
			}
		}

		getCurrentUserId();
		getCurrentGameData();
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
