import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function useAuthentication() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		async function checkAuthStatus() {
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
		}

		checkAuthStatus();
	}, []);

	async function handleLogout() {
		try {
			const response = await fetch('http://localhost:8080/auth/logout', {
				method: 'POST',
				credentials: 'include', // Include credentials for cookies if used
			});
			if (response.ok) {
				setIsAuthenticated(false);
				navigate('/');
				window.location.reload(); //refresh page, then socket set user status, if anybody is requesting anything socket will track anything and sleeps so we refresh
			} else {
				console.error('Logout failed');
			}
		} catch (error) {
			console.error('Network error:', error);
		}
	}

	return { isAuthenticated, handleLogout };
}
