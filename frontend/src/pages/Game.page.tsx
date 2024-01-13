import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import '../css/game.css';
import Paddle from '../components/game_jj/Paddle';

// A utility function to throttle the calls to a function
function throttle(callback, limit) {
	let waiting = false; // Initially, we're not waiting
	return function (...args) {
		// We return a throttled function
		if (!waiting) {
			// If we're not waiting
			callback.apply(this, args); // Execute users callback
			waiting = true; // Prevent future invocations
			setTimeout(function () {
				// After a period of time
				waiting = false; // And allow future invocations
			}, limit);
		}
	};
}
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
				const userResponse = await fetch('http://localhost:8080/user/id', {
					credentials: 'include',
				});
				if (!userResponse.ok) throw new Error('Failed to fetch user ID');
				const userData = await userResponse.json();
				const gameResponse = await fetch('http://localhost:8080/game/my-game', {
					credentials: 'include',
				});
				if (!gameResponse.ok) throw new Error('Failed to fetch game data');
				const gameData = await gameResponse.json();
				setUserId(userData.id);
				setUserName(userData.name);
				setGameData(gameData);
				setGameReady(gameData.started);
				setOppoReady(gameData.started);
				// Directly set the paddle positions without using a functional update
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
	}, []); // The dependency array should be empty to mimic componentDidMount behavior

	useEffect(() => {
		// We wrap handleResize in a throttle function to limit how often it can be called
		const throttledHandleResize = throttle(function handleResize() {
			const newGameWidth = Math.min(window.innerWidth, 1200);
			const newGameHeight = Math.min(window.innerHeight, 800);
			const widthRatio = newGameWidth / gameWidth;
			const heightRatio = newGameHeight / gameHeight;
			const newPos1 = ballPosition.x * widthRatio;
			const newPos2 = ballPosition.y * heightRatio;
			setGameWidth(newGameWidth);
			setGameHeight(newGameHeight);
			setBallPosition({ x: newPos1, y: newPos2 });
		}, 250); // For instance, only allow it to be called once every 250ms

		window.addEventListener('resize', throttledHandleResize);
		return () => window.removeEventListener('resize', throttledHandleResize);
	}, [gameWidth, gameHeight, ballPosition]); // Dependencies remain the same

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
		socket.on('gameStart', (data) => {
			console.log('data: ', data);
			setGameData(data);
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
			// Update scores and reset ball position to the center immediately
			setGameData((prevGameData) => {
				if (prevGameData) {
					return {
						...prevGameData,
						ballPosition: [gameWidth / 2, gameHeight / 2],
						scorePlayerOne: updatedScoreData.scorePlayerOne,
						scorePlayerTwo: updatedScoreData.scorePlayerTwo,
					};
				}
				return prevGameData;
			});

			// Wait for 1 second before starting the ball movement
			setTimeout(() => {
				setGameData((prevGameData) => {
					if (prevGameData) {
						return {
							...prevGameData,
							ballDirection: [updatedScoreData.ballDirection[0], updatedScoreData.ballDirection[1]],
						};
					}
					return prevGameData;
				});
			}, 1000);
		};

		socket.on('newBall', handleScoreUpdate);

		return () => {
			socket.off('newBall', handleScoreUpdate);
		};
	}, [socket, gameWidth, gameHeight]); // Add necessary dependencies to the dependency array

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

	//TODO: TOP BOt Border && paddle collision
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
				}
				return { x: newX, y: newY };
			}
			return prevPosition;
		});
	};

	return (
		<div className="gameContainer">
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
					<Paddle
						position={myPaddle}
						isLeft={true}
						gameWidth={gameWidth}
						gameHeight={gameHeight}
						paddleHeight={paddleHeight}
					/>
					<Paddle
						position={opPaddle}
						isLeft={false}
						gameWidth={gameWidth}
						gameHeight={gameHeight}
						paddleHeight={paddleHeight}
					/>

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
