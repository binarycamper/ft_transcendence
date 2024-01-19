import '@mantine/core/styles.css';
import Cookies from 'js-cookie';
import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import { socket } from './services/socket';
import { theme } from './theme';
import { useEffect } from 'react';

export default function App() {
	useEffect(() => {
		socket.on('connect', () => {
			console.log(`App: Connected to server with socket id: ${socket.id}`);
		});

		socket.on('disconnect', (reason) => {
			console.log(`App: Disconnected: ${reason}`);
		});

		socket.on('reconnect_attempt', () => {
			console.log('App: Attempting to reconnect...');
		});

		// No need to disconnect the socket on cleanup
		// The socket will persist across the app's life
		return () => {
			socket.off('connect');
			socket.off('disconnect');
			socket.off('reconnect_attempt');
		};
	}, []);

	/* useEffect(() => {
		async function fetchSessionCookie(): Promise<{ key: string; value: string }> {
			const response = await fetch(`http://localhost:8080/pong/create-cookie`);
			const data = await response.json();
			return data;
		}

		const session = Cookies.get('playerID');
		if (!session) {
			fetchSessionCookie()
				.then(({ key, value }) => {
					Cookies.set(key, value, { expires: 7 });
				})
				.catch((error) => {
					console.error('Error creating session cookie:', error);
				});
		}
	}, []); */

	return (
		<MantineProvider defaultColorScheme="auto" theme={theme}>
			<Router />
		</MantineProvider>
	);
}
