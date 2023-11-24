import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Signup() {
	const [password, setPassword] = useState('');
	const navigate = useNavigate();

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
			const locationUrl = response.headers.get('Location');

			if (response.status === 200) {
				navigate('/');
			} else if (response.status === 303) {
				if (locationUrl) {
					navigate(locationUrl);
				} else {
					console.error('Location header is missing');
				}
				const data = await response.json();
				console.log('Profile update successful:', data);
			} else {
				const errorData = await response.json();
				console.error('Profile update failed:', errorData);
			}
		} catch (error) {
			console.error('Network error:', error);
			// Handle network errors, e.g., show an error message
		}
	};

	return (
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
				<button type="submit">Submit</button>
			</form>
		</div>
	);
}
