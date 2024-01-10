import React, { useState, useEffect, useRef, useContext } from 'react';
import { SocketContext } from './context/socketContext';

const GamePage = () => {
	// Socket context
	const socket = useContext(SocketContext);

	// Screen dimensions
	const [screenWidth, setScreenWidth] = useState(window.innerWidth);
	const [screenHeight, setScreenHeight] = useState(window.innerHeight);

	// User and game state
	const [currentUserId, setCurrentUserId] = useState(null);
	const [currentUserName, setCurrentUserName] = useState(null);

	// Game state
	const [ballPosition, setBallPosition] = useState({ x: screenWidth / 2, y: screenHeight / 2 });
	const [playerScores, setPlayerScores] = useState({ player1: 0, player2: 0 });
	const [gameReady, setGameReady] = useState(false);

	const leftPaddleRef = useRef(null);
	const rightPaddleRef = useRef(null);

	useEffect(() => {
		// Fetch user information
		async function getCurrentUserId() {
			try {
				const response = await fetch('http://localhost:8080/user/id', {
					credentials: 'include',
				});
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

		socket.on('gameStart', (game) => {
			// Update game state based on the data received from the server
			console.log('Game is starting', game);
			setPlayerScores({
				player1: game.scorePlayerOne,
				player2: game.scorePlayerTwo,
			});
			// Other game state initializations based on the 'game' object
		});

		// TODO: check for better writing of this
		const handleResize = () => {
			setScreenWidth(window.innerWidth);
			setScreenHeight(window.innerHeight);
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	useEffect(() => {
		// Add socket event listeners and game logic
		return () => {
			// Cleanup socket listeners
		};
	}, [socket]);

	const handlePaddleMovement = (event: any) => {
		// Handle user input for paddle movement
	};

	const startGame = () => {
		setGameReady(true);
		// Inform the server that the user is ready
		socket.emit('playerReady');
	};

	return (
		<div className="game-container" onMouseMove={handlePaddleMovement}>
			<h2>Ping Pong Game</h2>
			<div className="game-board">
				{/* Render game elements */}
				<div className="ball" style={{ left: ballPosition.x, top: ballPosition.y }}></div>
				<div className="left-paddle" ref={leftPaddleRef}></div>
				<div className="right-paddle" ref={rightPaddleRef}></div>
			</div>
			<div>
				Current User: <strong>{currentUserName || 'Loading...'}</strong>
			</div>
			{!gameReady && <button onClick={startGame}>Start Game</button>}
		</div>
	);
};

export default GamePage;
