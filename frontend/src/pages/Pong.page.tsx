import { Button, Container, Loader } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
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
		socket.emit('join-lobby');
		socket.on('lobby-stats', updateStats);
		function updateStats(stats: OnlineStats) {
			setStats(stats);
		}
		return () => {
			socket.emit('leave-lobby');
			socket.off('lobby-stats');
		};
	}, []);

	const handleRequest = useCallback(
		(event: string) => {
			const gameSettings = getGameSettings();
			socket.emit(event, gameSettings, () => {
				setIsLoading(true);
			});
			socket.on('pong-game-created', (data) => {
				socket.off('pong-game-created');
				navigate(`/game/${data}`);
			});
		},
		[navigate],
	);

	const cancelRequest = useCallback(() => {
		socket.emit('cancel-game-request', () => {
			setIsLoading(false);
		});
	}, []);

	return (
		<>
			<Container w={'50vw'} my={'20'}>
				<div>
					<Button
						my={'20'}
						fullWidth
						onClick={() => handleRequest('join-queue')}
						disabled={isLoading}
					>
						JOIN GAME
					</Button>
				</div>
				<div>
					<Button
						my={'20'}
						fullWidth
						onClick={() => handleRequest('play-with-computer')}
						disabled={isLoading}
					>
						PLAY WITH THE COMPUTER
					</Button>
				</div>
				{stats && (
					<>
						<div>
							{stats.players} active player{stats.players !== 1 && 's'}
							{stats.waiting !== 0 && ` (${stats.waiting} waiting)`}
						</div>
						<div>
							{stats.games} game{stats.games !== 1 && 's'} in play
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
			</Container>
		</>
	);
}
