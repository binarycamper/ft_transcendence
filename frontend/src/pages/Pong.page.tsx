import { Button } from '@mantine/core';
import { getGameSettings } from '../components/Pong/GameDefaults';
import { gameSocket as socket } from '../services/socket';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function PongPage() {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);

	function playWithComputer() {}

	function createGame() {
		const gameSettings = getGameSettings();
		socket.emit('create-custom-game', gameSettings);
		setIsLoading(true);
		socket.on('pong-game-ready', (data) => {
			navigate(`/game/${data}`);
		});
	}

	function joinGame() {
		socket.emit('join-game');
		setIsLoading(true);
		socket.on('pong-game-ready', (data) => {
			navigate(`/game/${data}`);
		});
	}

	if (isLoading) {
		return (
			<>
				<div>Waiting for Server</div>
				<div>or waiting for other player to join</div>
				<div>(improve this message to be more specific)</div>
			</>
		);
	}

	return (
		<>
			<Button onClick={playWithComputer}>PLAY WITH THE COMPUTER</Button>
			<div></div>
			<Button onClick={createGame}>CREATE NEW GAME</Button>
			<div></div>
			<Button onClick={joinGame}>JOIN GAME</Button>
			<div></div>
		</>
	);
}
