import { Button, Loader } from '@mantine/core';
import { useEffect, useState, useCallback } from 'react';
import { getGameSettings } from '../components/Pong/GameDefaults';
import { gameSocket as socket } from '../services/socket';
import { useNavigate } from 'react-router-dom';

interface OnlineStats {
	games: number;
	players: number;
	waiting: number;
}

export default function PongPage() {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);
	const [stats, setStats] = useState<OnlineStats>();

	useEffect(() => {
		// Event listener for lobby stats
		const updateStats = (stats: OnlineStats) => {
			setStats(stats);
		};
		socket.on('lobby-stats', updateStats);

		// Cleanup function for lobby stats
		return () => {
			socket.off('lobby-stats', updateStats);
		};
	}, []);

	useEffect(() => {
		// Event listener for game ready
		const handleGameReady = (data) => {
			navigate(`/game/${data}`);
		};
		socket.on('pong-game-ready', handleGameReady);

		// Cleanup function for game ready
		return () => {
			socket.off('pong-game-ready', handleGameReady);
		};
	}, [navigate]);

	const handleRequest = useCallback((event: string) => {
		const gameSettings = getGameSettings();
		socket.emit(event, gameSettings);
		setIsLoading(true);
	}, []);

	const joinGame = () => handleRequest('join-game');
	const playWithFriend = () => handleRequest('play-with-friend');
	const playWithComputer = () => handleRequest('play-with-computer');

	const cancelRequest = () => {
		socket.emit('cancel-game-request', () => {
			setIsLoading(false);
		});
	};

	return (
		<>
			<Button onClick={joinGame} disabled={isLoading}>
				JOIN GAME
			</Button>
			<div></div>
			<Button onClick={playWithFriend} disabled={isLoading}>
				PLAY WITH A FRIEND
			</Button>
			<div></div>
			<Button onClick={playWithComputer} disabled={isLoading}>
				PLAY WITH THE COMPUTER
			</Button>
			{stats && (
				<>
					<div>
						{stats.players} player{stats.players === 1 ? '' : 's'}
						{stats.waiting !== 0 && ` (${stats.waiting} waiting)`}
					</div>
					<div>
						{stats.games} game{stats.games === 1 ? '' : 's'} in play
					</div>
				</>
			)}
			{isLoading && (
				<>
					<Loader color="blue" size="xl" type="dots" />
					<Button color="red" onClick={cancelRequest}>
						CANCEL
					</Button>
				</>
			)}
		</>
	);
}
