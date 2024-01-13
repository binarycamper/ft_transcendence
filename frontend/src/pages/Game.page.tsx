import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import '../css/game.css';

// Game arena dimensions

const topBorder = 15;
const paddleHeight = 125;

const GamePage = () => {
	interface Player {
		id: string;
		name: string;
		customImage: string;
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
		ballPosition: [number, number];
	}

	const [userId, setUserId] = useState('');
	const [userName, setUserName] = useState('');

	//graphic:
	const [gameWidth, setGameWidth] = useState(Math.min(window.innerWidth, 1200));
	const [gameHeight, setGameHeight] = useState(Math.min(window.innerHeight, 800));
	const paddleWidth = gameWidth * 0.02; // 2% of game width
	const paddleOffset = gameWidth * 0.05; // 5% from the side of the game area

	//games Init
	const [gameMode, setGameMode] = useState<boolean>(false);
	const [gameData, setGameData] = useState<GameData | null>(null);
	const [gameReady, setGameReady] = useState(false);
	const [oppoReady, setOppoReady] = useState(false);
	const [ballPosition, setBallPosition] = useState({ x: 600, y: 400 });
	const [myPaddle, setMyPaddle] = useState(0);
	const [opPaddle, setOpPaddle] = useState(0);

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
				console.log('data.image request: ', data.customImage); //TODO: RENDER IMAGE AS AVATAR.
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

	useEffect(() => {
		function handleResize() {
			setGameWidth(Math.min(window.innerWidth, 1200));
			setGameHeight(Math.min(window.innerHeight, 800));
		}

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
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
			let newPaddlePosition = myPaddle;
			const movementAmount = gameHeight / 120; // Adjust movement amount if necessary
			console.log('movement val: ', movementAmount);
			// Move up
			if (key === 'w') {
				newPaddlePosition -= movementAmount;
				if (newPaddlePosition < topBorder) {
					newPaddlePosition = topBorder; // Prevent the paddle from moving above the top border
				}
			}
			// Move down
			else if (key === 's') {
				newPaddlePosition += movementAmount;
				// Prevent the paddle from moving below the bottom of the game area
				const maxPaddleBottom = gameHeight - paddleHeight - topBorder;
				if (newPaddlePosition > maxPaddleBottom) {
					newPaddlePosition = maxPaddleBottom;
				}
			}

			// Update paddle position
			if (newPaddlePosition !== myPaddle) {
				setMyPaddle(newPaddlePosition);
				// Emit event to server if necessary
				socket.emit('keydown', { key: key === 'w' ? 'up' : 'down' });
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
				setMyPaddle(updatedGameData.playerOnePaddle * (gameHeight / 120));
				setOpPaddle(updatedGameData.playerTwoPaddle * (gameHeight / 120));
			} else if (gameData?.playerTwo.id === userId) {
				setMyPaddle(updatedGameData.playerTwoPaddle * (gameHeight / 120));
				setOpPaddle(updatedGameData.playerOnePaddle * (gameHeight / 120));
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

	const getCurrentUserAvatarUrl = () => {
		if (gameData) {
			if (gameData.playerOne.id === userId) {
				return gameData.playerOne.customImage;
			} else if (gameData.playerTwo.id === userId) {
				return gameData.playerTwo.customImage;
			}
		}
		return ''; // Return a default image or empty string if no match
	};

	const getOpponentAvatarUrl = () => {
		if (gameData) {
			return gameData.playerOne.id !== userId
				? gameData.playerOne.customImage
				: gameData.playerTwo.customImage;
		}
		return ''; // Return a default image or empty string if no match
	};

	return (
		<div className="gameContainer" style={{ width: `${gameWidth}px`, height: `${gameHeight}px` }}>
			<h1 className="gameHeader">Ping Pong Game</h1>
			<div className="scoreboard">
				<div className="player-info">
					{/* Display user avatar using the image URL */}
					{/* Display user avatar using the image URL */}
					<img
						src={getCurrentUserAvatarUrl()}
						alt={`${userName}'s avatar`}
						className="player-avatar"
					/>
					<span>
						{userName} ({getUserPos()}): {getPlayerScore()}
					</span>
				</div>
				<div className="player-info">
					{/* Display opponent avatar using the image URL */}
					<img src={getOpponentAvatarUrl()} alt="Opponent's avatar" className="player-avatar" />
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
					<div
						className="paddle left"
						style={{ top: `${myPaddle}px`, left: `${paddleOffset}px`, width: `${paddleWidth}px` }}
					/>
					<div
						className="paddle right"
						style={{ top: `${opPaddle}px`, right: `${paddleOffset}px`, width: `${paddleWidth}px` }}
					/>
					<div
						className="ball"
						style={{
							left: `${gameData?.ballPosition[0]}px`,
							top: `${gameData?.ballPosition[1]}px`,
						}}
					/>
					{/* Optionally, render a pause button or other in-game options */}
				</>
			)}
			{/* Ready button and other UI elements */}
		</div>
	);
};

export default GamePage;
