import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, Container, Group, Tabs } from '@mantine/core';
import io, { Socket } from 'socket.io-client';

export function Header() {
	const navigate = useNavigate();
	const pathname = useLocation().pathname;
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	// Define the socket instance in the state
	const [socket, setSocket] = useState<Socket | null>(null);

	useEffect(() => {
		// Initialize the WebSocket connection if the user is authenticated
		if (isAuthenticated) {
			const authToken = localStorage.getItem('authToken');
			const newSocket = io('http://localhost:8080', {
				query: { auth_token: authToken },
			});
			setSocket(newSocket);
		}
		return () => {
			socket?.disconnect();
		};
	}, [isAuthenticated]);

	useEffect(() => {
		const checkAuthStatus = async () => {
			try {
				const response = await fetch('http://localhost:8080/auth/status', {
					credentials: 'include', // Ensures cookies are sent with the request
				});
				if (response.ok) {
					const data = await response.json();
					setIsAuthenticated(data.isAuthenticated);
				} else {
					setIsAuthenticated(false);
				}
			} catch (error) {
				console.error('Error checking authentication status:', error);
				setIsAuthenticated(false);
			}
		};

		checkAuthStatus();
	}, []);

	const handleLogout = async () => {
		try {
			const response = await fetch('http://localhost:8080/auth/logout', {
				method: 'POST',
				credentials: 'include',
			});

			if (response.ok) {
				if (socket) {
					socket.disconnect();
				}
				localStorage.removeItem('authToken');
				setIsAuthenticated(false);
				navigate('/');
			} else {
				console.error('Logout failed');
			}
		} catch (error) {
			console.error('Network error:', error);
		}
	};

	return (
		<Container size="xl">
			<Group justify="space-between" h="100%">
				<Group>
					<h1 className="site-title">
						<a href="/" style={{ textDecoration: 'none' }}>
							pong
						</a>
					</h1>
					<Tabs value={pathname} onChange={(value) => navigate(`${value}`)}>
						<Tabs.List>
							<Tabs.Tab value="/play">Play</Tabs.Tab>
							<Tabs.Tab value="/chat">Chat</Tabs.Tab>
							<Tabs.Tab value="/profile">Profile</Tabs.Tab>
							<Tabs.Tab value="/settings">Settings</Tabs.Tab>
						</Tabs.List>
					</Tabs>
				</Group>
				<Group>
					{!isAuthenticated ? (
						<Button component="a" href="/login">
							Sign in
						</Button>
					) : (
						<Button onClick={handleLogout}>Logout</Button>
					)}
				</Group>
			</Group>
			<Container size="xl" py={16}>
				<div id="outlet">
					<Outlet />
				</div>
			</Container>
		</Container>
	);
}
