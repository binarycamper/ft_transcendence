import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import { socket } from './services/socket';
import { theme } from './theme';
import { useEffect } from 'react';

export default function App() {
	useEffect(() => {
		socket.on('connect', () => {
			console.log(`Connected to server with socket id: ${socket.id}`);
		});

		socket.on('disconnect', (reason) => {
			console.log(`Disconnected: ${reason}`);
		});

		socket.on('reconnect_attempt', () => {
			console.log('Attempting to reconnect...');
		});

		// No need to disconnect the socket on cleanup
		// The socket will persist across the app's life
		return () => {
			socket.off('connect');
			socket.off('disconnect');
			socket.off('reconnect_attempt');
		};
	}, []);

	return (
		<MantineProvider defaultColorScheme="auto" theme={theme}>
			<Router />
		</MantineProvider>
	);
}
