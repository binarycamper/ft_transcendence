import React, { useEffect } from 'react';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import { theme } from './theme';
import io from 'socket.io-client';

//TODO: User gets only tracked offline when pages refreshed thats no heartbeat..
export default function App() {
	useEffect(() => {
		// Initialize the WebSocket connection
		const authToken = localStorage.getItem('authToken');

		const socket = io('http://localhost:8080/events', {
			query: { auth_token: authToken },
		});

		// Log when connected
		socket.on('connect', () => {
			console.log(`Connected to server with socket id: ${socket.id}`);
		});

		// Log when the client disconnects
		socket.on('disconnect', (reason) => {
			console.log(`Disconnected: ${reason}`);
		});

		// Log when the client attempts to reconnect
		socket.on('reconnect_attempt', () => {
			console.log('Attempting to reconnect...');
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
