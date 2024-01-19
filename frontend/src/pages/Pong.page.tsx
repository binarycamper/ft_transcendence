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
	const [userId, setUserId] = useState<string | null>(null);

	async function getUserIdFromServer() {
		try {
			const response = await fetch('http://localhost:8080/user/id', {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const text = await response.text();
			if (!text) {
				throw new Error('Response body is empty');
			}
			try {
				const data = JSON.parse(text);
				return data;
			} catch (error) {
				throw new Error('Failed to parse JSON response');
			}
		} catch (error) {
			console.error('Error fetching user ID:', error);
			throw error;
		}
	}

	useEffect(() => {
		const fetchUserId = async () => {
			try {
				const data = await getUserIdFromServer();
				setUserId(data.id);
			} catch (error) {
				window.location.href = 'http://localhost:5173/login';
				// console.error('Error retrieving user ID:', error);
			}
		};

		fetchUserId();
	}, []);

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
			if (userId) {
				console.log('USERID: ', userId);
				socket.emit('game-ready-acknowledgement', { gameURL: data, userId });
			} else console.log('game vs Computer');
			navigate(`/game/${data}`);
		};

		socket.on('pong-game-ready', handleGameReady);

		// Cleanup function for game ready
		return () => {
			socket.off('pong-game-ready', handleGameReady);
		};
	}, [navigate, userId]);

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
