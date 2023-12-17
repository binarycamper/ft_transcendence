import React, { useContext, useEffect } from 'react';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import { theme } from './theme';
import { SocketContext } from './pages/context/socketContext';

export default function App() {
	const socket = useContext(SocketContext);
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
