import React, { useEffect } from 'react';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import { theme } from './theme';
import io from 'socket.io-client';

export default function App() {
	useEffect(() => {
		// Initialize the WebSocket connection
		const socket = io('http://localhost:8080/events'); // Your server address

		// Log when connected
		socket.on('connect', () => {
			console.log(`Connected to server with socket id: ${socket.id}`);
		});

		// Clean up the connection when the component unmounts
		return () => {
			socket.disconnect();
			console.log('Disconnected from server');
		};
	}, []); // Empty array ensures this runs once on mount and once on unmount

	return (
		<MantineProvider defaultColorScheme="auto" theme={theme}>
			<Router />
		</MantineProvider>
	);
}
