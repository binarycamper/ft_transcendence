import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function CompleteProfile() {
	const [password, setPassword] = useState('');
	const [passwordError, setPasswordError] = useState('');
	const [isProfileComplete, setIsProfileComplete] = useState(false);
	const [setup2FA, setSetup2FA] = useState(false);
	const [info, setinfo] = useState('');

	const navigate = useNavigate();

	const validatePassword = (password: string) => {
		const minLength = 8;
		const hasUpperCase = /[A-Z]/.test(password);
		const hasLowerCase = /[a-z]/.test(password);
		const hasNumbers = /\d/.test(password);
		const hasSpecialChar = /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?!°]+/.test(password);

		let errorMessage = '';
		if (password.length < minLength) {
			errorMessage += `Password must be at least ${minLength} characters long. `;
		}
		if (!hasUpperCase) {
			errorMessage += 'Password must include at least one uppercase letter. ';
		}
		if (!hasLowerCase) {
			errorMessage += 'Password must include at least one lowercase letter. ';
		}
		if (!hasNumbers) {
			errorMessage += 'Password must include at least one number. ';
		}
		if (!hasSpecialChar) {
			errorMessage += 'Password must include at least one special character. ';
		}
		console.log('ERRORORR: ', errorMessage);
		return errorMessage;
	};

	useEffect(() => {
		const checkProfileStatus = async () => {
			try {
				const response = await fetch('http://localhost:8080/user/isProfileComplete', {
					credentials: 'include',
				});
				const data = await response.json();
				setIsProfileComplete(data.isComplete);
				if (data.isComplete) {
					navigate('/profile'); // Weiterleitung zur Profilseite
				}
			} catch (error: any) {
				setinfo(error);
				//console.error('Error checking profile status:', error);
			}
		};
		checkProfileStatus();
	}, [navigate]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		//TOdo: Validate the password
		/*const msg = validatePassword(password);
		if (msg !== '') {
			setPasswordError(msg);
			return;
		}*/
		// Clear the previous password error
		setPasswordError('');

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

			const data = await response.json();
			console.log('Complete Profile Response:', data);

			if (response.ok) {
				if (setup2FA) {
					console.log('UserId for 2FA setup:', data.userId);
					navigate('/twofactorsetup', { state: { userId: data.userId } }); // Weiterleitung zur 2FA-Setup-Seite
				} else {
					navigate('/profile'); // Weiterleitung zur Profilseite
				}
			} else {
				// Assuming that 'message' is an array of objects and you want to display 'isStrongPassword' constraint
				const messages = data.message.map((item) => item.constraints.isStrongPassword).join(' ');
				setinfo(messages || 'An error occurred');
			}
		} catch (error) {
			console.log('test 2');
			setinfo('failed setting pw');
		}
	};

	return (
		<div>
			{isProfileComplete ? (
				<p>Redirecting to your profile...</p>
			) : (
				<div>
					<h1>Complete Your Profile</h1>
					{info && <p className="error-message">{info}</p>}
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
							{passwordError && <p>{passwordError}</p>}
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
