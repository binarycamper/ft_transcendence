import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../services/socket';
import Game from '../components/Game/Game';

interface CurrUser {
	id: string;
	name: string;
}
interface Player {
	id: string;
	name: string;
}

interface Enemy {
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
	ballPosition: number[];
	ballDirection: number[];
	ballSpeed: number;
	playerOneGameWidth: number | null;
	playerOneGameHeight: number | null;
	playerTwoGameWidth: number | null;
	playerTwoGameHeight: number | null;
}

// Create contexts and provide initial values
export const CurrUserContext = React.createContext<CurrUser | null>(null);
export const PlayerContext = React.createContext<Player | null>(null);
export const GameDataContext = React.createContext<GameData | null>(null);

function GamePage() {
	const [game, setGame] = useState<GameData | null>(null);
	const [currUser, setCurrUser] = useState<CurrUser | null>(null);
	const [player, setPlayer] = useState<Player | null>(null);
	const [isPlayerOne, setIsPlayerOne] = useState(false);
	const [enemy, setEnemy] = useState<Enemy | null>(null); // New state for the enemy player
	const [gameMode, setGameMode] = useState<boolean | null>(null);
	const [gameStarted, setGameStarted] = useState(false);
	let canvasRef = useRef<HTMLCanvasElement>(null);

	const handleDebugPrint = () => {
		console.log('Debug Print:');
		console.log('Current User:', currUser);
		console.log('Game Data:', game);
		console.log('Player Data:', player);
		console.log('Enemy Data:', enemy);
	};

	useEffect(() => {
		async function getUserIdAndGameData() {
			try {
				const userResponse = await fetch('http://localhost:8080/user/id', {
					credentials: 'include',
				});
				if (!userResponse.ok) throw new Error('Failed to fetch user ID');
				const userData = await userResponse.json();
				setCurrUser(userData);

				const gameResponse = await fetch('http://localhost:8080/game/my-game', {
					credentials: 'include',
				});
				if (!gameResponse.ok) throw new Error('Failed to fetch game data');
				const gameData = await gameResponse.json();
				setGame(gameData);

				// Check if either currUser or gameData is null and redirect if so
				if (!userData || !gameData) {
					window.location.href = 'http://localhost:5173/';
					return; // Return early to prevent further code execution
				}
				setGameMode(gameData.gameMode);
				// If there is a player associated with the game, fetch player data
				if (gameData.playerOne.id === userData?.id) {
					setIsPlayerOne(true);
					setPlayer(gameData.playerOne); //player === currUSer now
					setEnemy(gameData.playerTwo); // Set the enemy player
				} else if (gameData.playerTwo.id === userData?.id) {
					setIsPlayerOne(false);
					setPlayer(gameData.playerTwo);
					setEnemy(gameData.playerOne); // Set the enemy player
				}
				socket.on('gameStart', (game) => {
					console.log('Game has started:', game);
					setGame(game);
					setGameStarted(true);
					window.location.href = 'http://localhost:5173/game-arena';
				});

				// Remove the "gameStart" event listener when the component unmounts
				return () => {
					socket.off('gameStart');
				};
			} catch (error) {
				console.error('Error fetching data:', error);
				window.location.href = 'http://localhost:5173/';
			}
		}

		if (!game && !currUser) {
			getUserIdAndGameData();
		}
	}, [game, currUser, game]);

	const startGame = () => {
		socket.emit('playerReady', {});
	};

	const toggleGameMode = async () => {
		if (!isPlayerOne) {
			console.log('only player1 can toggle!'); // TODO: better info for user!
			return;
		}
		try {
			const newGameMode = !gameMode; // Toggle the mode

			const response = await fetch('http://localhost:8080/game/game-mode', {
				credentials: 'include',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ gameMode: newGameMode }), // Send the new game mode
			});

			if (!response.ok) {
				console.log('Failed to update game mode on the server');
				return;
			}

			setGameMode(newGameMode); // Update local state
		} catch (error) {
			console.log('Error while updating game mode:', error);
		}
	};

	return (
		<div className={game && game?.winnerId ? 'TODO/WINNER/ANIMATION' : 'TODO/WINNER/ANIMATION'}>
			{/* Debug Print Button - Always visible */}
			<button onClick={handleDebugPrint} className="debugPrintButton">
				Debug Print
			</button>
			{!game?.started && (
				<div>
					{/* Existing buttons */}
					<button onClick={startGame} className="readyButton">
						Ready
					</button>
					<button
						onClick={toggleGameMode}
						className={`modeButton ${gameMode ? 'modeButtonOn' : 'modeButtonOff'}`}
					>
						{gameMode ? 'BoshyMode: ON' : 'BoshyMode: OFF'}
					</button>
				</div>
			)}
		</div>
	);
}
export default GamePage;
