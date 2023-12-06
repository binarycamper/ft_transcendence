import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Signup() {
	const [password, setPassword] = useState('');
	const [isProfileComplete, setIsProfileComplete] = useState(false);
	const [setup2FA, setSetup2FA] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		const checkProfileStatus = async () => {
			// Using URLSearchParams to parse the query string
			const queryParams = new URLSearchParams(window.location.search);
			const token = queryParams.get('token');
			//console.log('TOKEN= ', token);
			if (token) {
				localStorage.setItem('authToken', token);
			}
			try {
				const response = await fetch('http://localhost:8080/user/isProfileComplete', {
					credentials: 'include',
				});
				const data = await response.json();
				setIsProfileComplete(data.isComplete);
				if (data.isComplete) {
					navigate('/profile'); // Weiterleitung zur Profilseite
				}
			} catch (error) {
				console.error('Error checking profile status:', error);
			}
		};

		checkProfileStatus();
	}, [navigate]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const API_URL = 'http://localhost:8080/user/complete';
		try {
			const response = await fetch(API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ password }),
				credentials: 'include',
			});

			if (response.status === 200 || response.status === 401 || response.status === 303) {
				if (setup2FA) {
					navigate('/twofactorsetup'); // Weiterleitung zur 2FA-Setup-Seite
				} else {
					navigate('/profile'); // Weiterleitung zur Profilseite
				}
			} else {
				const data = await response.json();
				console.log('Profile update successful:', data);
			}
		} catch (error) {
			console.error('Network error:', error);
			// Handle network errors, e.g., show an error message
		}
	};

	return (
		<div>
			{isProfileComplete ? (
				<p>Redirecting to your profile...</p>
			) : (
				<div>
					<h1>Complete Your Profile</h1>
					<form onSubmit={handleSubmit}>
						<div>
							<label htmlFor="password">Password:</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>
						<div>
							<input
								type="checkbox"
								id="setup2fa"
								checked={setup2FA}
								onChange={(e) => setSetup2FA(e.target.checked)}
							/>
							<label htmlFor="setup2fa">Set up Two-Factor Authentication</label>
						</div>
						<button type="submit">Submit</button>
					</form>
				</div>
			)}
		</div>
	);
}
