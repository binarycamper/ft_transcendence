import { Button, Loader } from '@mantine/core';
import { useEffect, useState } from 'react';
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
		socket.emit('join-lobby', (stats: OnlineStats) => {
			setStats(stats);
		});

		socket.emit('query-game-status', (data) => {
			setIsLoading(data.queuing);
			if (data.gameURL !== null) {
				const response = window.confirm('Do you want to go to the game?');
				if (response) {
					navigate(`/game/${data.gameURL}`);
				}
			}
		});

		socket.on('lobby-stats', (stats: OnlineStats) => {
			setStats(stats);
		});

		return () => {
			socket.emit('leave-lobby');
			socket.off('lobby-stats');
		};
	}, []);

	function handleRequest(event: string) {
		const gameSettings = getGameSettings();
		socket.emit(event, gameSettings);
		setIsLoading(true);
		socket.on('pong-game-ready', (data) => {
			navigate(`/game/${data}`);
		});
	}

	function createGame() {
		return handleRequest('create-custom-game');
	}

	function joinGame() {
		return handleRequest('join-game');
	}

	function playWithFriend() {
		return handleRequest('play-with-friend');
	}

	function playWithComputer() {
		return handleRequest('play-with-computer');
	}

	function cancelRequest() {
		socket.emit('cancel-game-request', () => {
			setIsLoading(false);
		});
	}

	return (
		<>
			<Button onClick={createGame} disabled={isLoading}>
				CREATE NEW GAME
			</Button>
			<div></div>
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
						{stats.players} player{stats.players === 1 || 's'}
						{stats.waiting !== 0 && ` (${stats.waiting} waiting)`}
					</div>
					<div>
						{stats.games} game{stats.games === 1 || 's'} in play
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
