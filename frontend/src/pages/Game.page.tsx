import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import '../css/game.css';
import Paddle from '../components/game_jj/Paddle';

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
		ballDirection: [number, number];
	}

	const [userId, setUserId] = useState('');
	const [userName, setUserName] = useState('');

	//graphic:
	const [gameWidth, setGameWidth] = useState(Math.min(window.innerWidth, 1200));
	const [gameHeight, setGameHeight] = useState(Math.min(window.innerHeight, 800));

	//games Init
	const [gameMode, setGameMode] = useState<boolean>(false);
	const [gameData, setGameData] = useState<GameData | null>(null);
	const [gameReady, setGameReady] = useState(false);
	const [oppoReady, setOppoReady] = useState(false);
	const [ballPosition, setBallPosition] = useState({ x: 600, y: 400 });
	const [myPaddle, setMyPaddle] = useState(0);
	const [opPaddle, setOpPaddle] = useState(0);
	const [ballSize, setBallSize] = useState(0);

	useEffect(() => {
		const ballElement = document.querySelector('.ball');
		if (ballElement) {
			const ballComputedStyle = window.getComputedStyle(ballElement);
			const size = parseFloat(ballComputedStyle.width);
			setBallSize(size);
		}
	}, [gameWidth, gameHeight]); // Recalculate when game dimensions change

	useEffect(() => {
		async function getUserIdAndGameData() {
			try {
				// Fetch user ID
				const userResponse = await fetch('http://localhost:8080/user/id', {
					credentials: 'include',
				});
				if (!userResponse.ok) {
					throw new Error('Failed to fetch user ID');
				}
				const userData = await userResponse.json();
				setUserId(userData.id);
				setUserName(userData.name);

				// Fetch game data
				const gameResponse = await fetch('http://localhost:8080/game/my-game', {
					credentials: 'include',
				});
				if (!gameResponse.ok) {
					throw new Error('Failed to fetch game data');
				}
				const gameData = await gameResponse.json();

				// Update state with the fetched data
				setGameData(gameData);
				setGameReady(gameData.started);
				setOppoReady(gameData.started);

				// Set paddle positions
				if (gameData.playerOne.id === userData.id) {
					setMyPaddle(gameData.playerOnePaddle * (gameHeight / 120));
					setOpPaddle(gameData.playerTwoPaddle * (gameHeight / 120));
				} else {
					setMyPaddle(gameData.playerTwoPaddle * (gameHeight / 120));
					setOpPaddle(gameData.playerOnePaddle * (gameHeight / 120));
				}
			} catch (error) {
				console.error('Error fetching data:', error);
				window.location.href = 'http://localhost:5173/';
			}
		}

		getUserIdAndGameData();
	}, []);

	useEffect(() => {
		function handleResize() {
			const newGameWidth = Math.min(window.innerWidth, 1200);
			const newGameHeight = Math.min(window.innerHeight, 800);

			// Calculate the ratio of new dimension to old dimension
			const widthRatio = newGameWidth / gameWidth;
			const heightRatio = newGameHeight / gameHeight;

			// Apply the ratio to the ball position
			const newPos1 = ballPosition.x * widthRatio;
			const newPos2 = ballPosition.y * heightRatio;

			// Update state with new game dimensions and ball position
			setGameWidth(newGameWidth);
			setGameHeight(newGameHeight);
			setBallPosition({ x: newPos1, y: newPos2 });
		}

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [gameWidth, gameHeight, ballPosition]); // Make sure to include all dependencies used in the effect

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
		socket.on('gameStart', () => {
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
		const handlePaddleUpdate = (updatedGameData: GameData) => {
			// Update only paddle positions to minimize re-renders
			if (gameData?.playerOne.id === userId) {
				setMyPaddle(updatedGameData.playerOnePaddle * (gameHeight / 120));
				setOpPaddle(updatedGameData.playerTwoPaddle * (gameHeight / 120));
			} else if (gameData?.playerTwo.id === userId) {
				setMyPaddle(updatedGameData.playerTwoPaddle * (gameHeight / 120));
				setOpPaddle(updatedGameData.playerOnePaddle * (gameHeight / 120));
			}
		};

		socket.on('handlePaddleUpdate', handlePaddleUpdate);

		return () => {
			socket.off('handlePaddleUpdate', handlePaddleUpdate);
		};
	}, [gameData, userId]); // Consider carefully the dependencies here

	useEffect(() => {
		const handleScoreUpdate = (updatedScoreData: GameData) => {
			setGameData((prevGameData) => {
				// Make sure prevGameData is not null before spreading
				if (prevGameData) {
					return {
						...prevGameData,
						scorePlayerOne: updatedScoreData.scorePlayerOne,
						scorePlayerTwo: updatedScoreData.scorePlayerTwo,
					};
				}
				return prevGameData;
			});
		};

		socket.on('scoreUpdate', handleScoreUpdate);

		return () => {
			socket.off('scoreUpdate', handleScoreUpdate);
		};
	}, [socket]); // Add socket to the dependency array

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

	useEffect(() => {
		const intervalId = setInterval(() => {
			if (gameReady && gameData) {
				updateBallPosition();
			}
		}, 100); // Update every 100ms, adjust as needed

		return () => clearInterval(intervalId);
	}, [gameReady, gameData, ballPosition, ballSize]);

	const updateBallPosition = () => {
		setBallPosition((prevPosition) => {
			if (gameData) {
				let newX = prevPosition.x + gameData.ballDirection[0];
				let newY = prevPosition.y + gameData.ballDirection[1];

				// Collision with top and bottom walls
				if (newY <= topBorder || newY >= gameHeight - ballSize) {
					gameData.ballDirection[1] = -gameData.ballDirection[1];
				}

				// Scoring logic for left and right walls
				if (newX <= 0 || newX >= gameWidth - ballSize) {
					// Reset the ball to the center
					newX = gameWidth / 2 - ballSize / 2;
					newY = gameHeight / 2 - ballSize / 2;

					// Update scores based on which side the ball left the screen
					if (newX <= 0) {
						gameData.scorePlayerTwo += 1;
					} else {
						gameData.scorePlayerOne += 1;
					}

					// Emit score update to server (if needed)
					socket.emit('scoreUpdate', {
						scorePlayerOne: gameData.scorePlayerOne,
						scorePlayerTwo: gameData.scorePlayerTwo,
					});

					// Reset ball direction (you might want to randomize this)
					gameData.ballDirection = [-gameData.ballDirection[0], gameData.ballDirection[1]];
				}

				return { x: newX, y: newY };
			}
			return prevPosition;
		});
	};

	return (
		<div className="gameContainer" style={{ width: `${gameWidth}px`, height: `${gameHeight}px` }}>
			<h1 className="gameHeader">Ping Pong Game</h1>
			<div className="scoreboard">
				<div className="player-info">
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
					{/* Use the Paddle component instead of the div for paddles */}
					<Paddle position={myPaddle} isLeft={true} />
					<Paddle position={opPaddle} isLeft={false} />
					<div
						className="ball"
						style={{
							left: `${ballPosition.x}px`,
							top: `${ballPosition.y}px`,
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
