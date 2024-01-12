import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import '../css/game.css';

// Game arena dimensions
const gameWidth = 1200;
const gameHeight = 800;
const topBorder = 135;
const paddleHeight = 125;

const GamePage = () => {
	interface Player {
		id: string;
		name: string;
	}

	interface GameData {
		id: string;
		playerOne: Player;
		acceptedOne: boolean;
		playerTwo: Player;
		acceptedTwo: boolean;
		started: boolean;
		scorePlayerOne: number;
		scorePlayerTwo: number;
		startTime: Date;
		endTime: Date | null;
		winnerId: string | null;
		playerOnePaddle: number;
		playerTwoPaddle: number;
		gameMode: boolean;
	}

	const [userId, setUserId] = useState('');
	const [userName, setUserName] = useState('');

	const [gameMode, setGameMode] = useState<boolean>(false);
	const [gameData, setGameData] = useState<GameData | null>(null);
	const [gameReady, setGameReady] = useState(false);
	const [oppoReady, setOppoReady] = useState(false);
	const [ballPosition, setBallPosition] = useState({ x: 300, y: 200 });
	const [myPaddle, setMyPaddle] = useState(250);
	const [opPaddle, setOpPaddle] = useState(250);

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
				console.log('error: ', error);
				window.location.href = 'http://localhost:5173/';
			}
		}
		getUserId();
	}, []);

	useEffect(() => {
		async function getCurrentGameData() {
			try {
				console.log('started');

				const response = await fetch('http://localhost:8080/game/my-game', {
					credentials: 'include',
				});
				if (!response.ok) {
					return;
				}
				const data = await response.json();
				setGameData(data);
				setGameReady(data.started);
				setOppoReady(data.started);
				if (data.playerOne.id === userId) {
					setMyPaddle(data.playerOnePaddle);
					setOpPaddle(data.playerTwoPaddle);
				} else {
					setMyPaddle(data.playerTwoPaddle);
					setOpPaddle(data.playerOnePaddle);
				}
			} catch (error) {
				// Handle error
			}
		}

		getCurrentGameData();
	}, []);

	const toggleGameMode = async () => {
		try {
			// Toggle the game mode on the client side
			setGameMode(!gameMode);
			const response = await fetch('http://localhost:8080/game/game-mode', {
				credentials: 'include',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ gameMode: !gameMode }),
			});

			if (!response.ok) {
				// Handle the response status or error here
				console.log('Failed to update game mode on the server');
				setGameMode(!gameMode); // Revert back to the previous game mode
			}
		} catch (error) {
			// Handle any network or fetch-related errors here
			console.log('Error while updating game mode:', error);
			// You may want to handle errors by resetting the game mode to its previous value
			setGameMode(!gameMode); // Revert back to the previous game mode
		}
	};

	useEffect(() => {
		socket.on('gameStart', (game) => {
			console.log('enemy sent start!');
			setOppoReady(true);
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
			if (!gameReady || !oppoReady || !gameData) return;

			const key = e.key.toLowerCase();
			let req;
			const movementAmount = 10;
			let newPaddlePosition = myPaddle;

			// If the 'w' key is pressed and paddle is above the topBorder, move up
			if (key === 'w' && myPaddle > topBorder) {
				newPaddlePosition = Math.max(newPaddlePosition - movementAmount, topBorder);
				req = 'up';
			}
			// If the 's' key is pressed and paddle is above the bottom minus paddleHeight, move down
			else if (key === 's' && myPaddle < gameHeight - paddleHeight) {
				newPaddlePosition = Math.min(newPaddlePosition + movementAmount, gameHeight - paddleHeight);
				req = 'down';
			}

			// Update paddle position and emit event to server
			if (req) {
				setMyPaddle(newPaddlePosition);
				socket.emit('keydown', { key: req });
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [myPaddle, gameReady, oppoReady, userId]);

	useEffect(() => {
		const handleGameUpdate = (updatedGameData: GameData) => {
			setGameData(updatedGameData);
			// Update local paddle position if it's different
			if (gameData?.playerOne.id === userId) {
				setMyPaddle(updatedGameData.playerOnePaddle);
				setOpPaddle(updatedGameData.playerTwoPaddle);
			} else if (gameData?.playerTwo.id === userId) {
				setMyPaddle(updatedGameData.playerTwoPaddle);
				setOpPaddle(updatedGameData.playerOnePaddle);
			}
		};

		socket.on('handleGameUpdate', handleGameUpdate);

		return () => {
			socket.off('handleGameUpdate', handleGameUpdate);
		};
	}, [gameData, userId, myPaddle]);

	const debugPrintGameData = () => {
		console.log('Current Game Data:', gameData);
	};

	const getUserPos = () => {
		return gameData?.playerOne.id === userId ? 'Player 1' : 'Player 2';
	};

	const getPlayerScore = () => {
		return getUserPos() === 'Player 1' ? gameData?.scorePlayerOne : gameData?.scorePlayerTwo;
	};

	return (
		<div className="gameContainer" style={{ width: `${gameWidth}px`, height: `${gameHeight}px` }}>
			<h1 className="gameHeader">Ping Pong Game</h1>
			<div className="scoreboard">
				<div className="player-info">
					<span>
						{userName} ({getUserPos()}): {getPlayerScore()}
					</span>
				</div>
				<div className="player-info">
					<span>
						{gameData?.playerOne.id === userId
							? `${gameData?.playerTwo.name} (Player 2): ${gameData?.scorePlayerTwo}`
							: `${gameData?.playerOne.name} (Player 1): ${gameData?.scorePlayerOne}`}
					</span>
				</div>
			</div>
			{!gameReady && (
				<>
					<button onClick={startGame} className="readyButton">
						Ready
					</button>
					{gameData && userId === gameData.playerOne.id && (
						<button
							onClick={toggleGameMode}
							className={`modeButton ${gameMode ? 'modeButtonOn' : 'modeButtonOff'}`}
						>
							{gameMode ? 'BoshyMode: ON' : 'BoshyMode: OFF'}
						</button>
					)}
				</>
			)}
			{gameReady && oppoReady && (
				<>
					<div className="paddle left" style={{ top: `${myPaddle}px` }} />
					<div className="paddle right" style={{ top: `${opPaddle}px` }} />
					<div
						className="ball"
						style={{ left: `${ballPosition.x}px`, top: `${ballPosition.y}px` }}
					/>
					{/* Optionally, render a pause button or other in-game options */}
				</>
			)}
			{/* Ready button and other UI elements */}
		</div>
	);
};

export default GamePage;
