import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ResetPassword() {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const { token } = useParams();
	const navigate = useNavigate();

	const handleSubmit = async (event: any) => {
		event.preventDefault();
		if (password !== confirmPassword) {
			alert("Passwords don't match!");
			return;
		}

		try {
			const response = await fetch(`http://localhost:8080/auth/update-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, password }),
			});
			if (response.ok) {
				alert('Password updated successfully!');
				navigate('/login');
			} else {
				alert('Failed to update password. Please try again.');
			}
		} catch (error) {
			console.error('Error:', error);
		}
	};

	return (
		<div>
			<h1>Reset Your Password</h1>
			<form onSubmit={handleSubmit}>
				<input
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="New Password"
				/>
				<input
					type="password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					placeholder="Confirm New Password"
				/>
				<button type="submit">Reset Password</button>
			</form>
		</div>
	);
}
