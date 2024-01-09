import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function useLogin() {
	const navigate = useNavigate();
	const [error, setError] = useState(false);

	async function handleLogin(email: string, password: string) {
		if (!email || !password) return void setError(true);

		try {
			const response = await fetch('http://localhost:8080/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
				credentials: 'include',
			});
			if (!response.ok) return void setError(true);

			setError(false);
			const data = await response.json();
			if (data.require2FA) {
				navigate('/twofactorsetup');
			} else {
				navigate('/profile');
			}
			window.location.reload();
		} catch (error) {
			console.error('Failed to initiate login', error);
		}
	}

	return { error, setError, handleLogin };
}
