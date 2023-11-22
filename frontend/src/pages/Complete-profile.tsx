// CompleteProfile.page.jsx
import React, { useState } from 'react';

export const CompleteProfile = () => {
	const [nickname, setNickname] = useState('');
	const [password, setPassword] = useState('');

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const API_URL = 'http://localhost:8080/user/complete';
		try {
			const response = await fetch(API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ nickname, password }),
				credentials: 'include',
			});

			if (response.status === 200) {
				window.location.href = '/';
			} else if (response.status === 303) {
				// If server indicates a See Other response, redirect to the provided location
				const location = response.headers.get('Location');
				window.location.href = location || '/'; // Default to root if location is not provided
			} else if (response.ok) {
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
					<label htmlFor="nickname">Nickname:</label>
					<input
						id="nickname"
						type="text"
						value={nickname}
						onChange={(e) => setNickname(e.target.value)}
						required
					/>
				</div>
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
};
