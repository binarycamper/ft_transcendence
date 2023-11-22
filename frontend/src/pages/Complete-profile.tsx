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

			const data = await response.json();

			if (response.ok) {
				console.log('Profile update successful:', data);
				// Handle successful profile update, e.g., redirect or show a success message
			} else {
				console.error('Profile update failed:', data);
				// Handle errors, e.g., show an error message
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
