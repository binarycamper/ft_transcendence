import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

export function CompleteProfile() {
	const [password, setPassword] = useState('');
	const [passwordError, setPasswordError] = useState('');
	const [passwordWarning, setPasswordWarning] = useState<Array<string>>([]);
	const [isProfileComplete, setIsProfileComplete] = useState(false);
	const [setup2FA, setSetup2FA] = useState(false);
	const [info, setInfo] = useState('');

	const navigate = useNavigate();

	function validatePassword(password: string) {
		let error = false;
		const options = {
			translations: zxcvbnEnPackage.translations,
			graphs: zxcvbnCommonPackage.adjacencyGraphs,
			dictionary: {
				...zxcvbnCommonPackage.dictionary,
				...zxcvbnEnPackage.dictionary,
			},
		};
		zxcvbnOptions.setOptions(options);
		const result = zxcvbn(password);
		if (result.feedback.warning) {
			setPasswordError(result.feedback.warning);
			error = true;
		} else {
			setPasswordError('');
		}
		if (result.feedback.suggestions) {
			setPasswordWarning(result.feedback.suggestions);
		} else {
			setPasswordWarning([]);
		}
		if (error) {
			return false;
		}
		return true;
	}

	useEffect(() => {
		async function checkProfileStatus() {
			try {
				const response = await fetch('http://localhost:8080/user/is-profile-complete', {
					credentials: 'include',
				});
				const data = await response.json();
				setIsProfileComplete(data.isComplete);
				if (data.isComplete) {
					navigate('/profile'); // Weiterleitung zur Profilseite
				}
			} catch (error) {
				setInfo(error as string);
				//console.error('Error checking profile status:', error);
			}
		}
		checkProfileStatus();
	}, [navigate]);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		//TOdo: Validate the password
		if (!validatePassword(password)) {
			return;
		}
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
			} else if (response.status === 400 || response.status === 303) {
				setInfo(data.message);
			} else {
				// Assuming that 'message' is an array of objects and you want to display 'isStrongPassword' constraint
				const messages = data.message
					.map((item: any) => item.constraints.isStrongPassword)
					.join(' ');
				setInfo(messages || 'An error occurred');
			}
		} catch (error) {
			console.log('test 2');
			setInfo(`failed setting pw: ${error}`);
		}
	}

	function handlePasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
		setPassword(event.target.value);
		if (event.target.value.length > 0) {
			validatePassword(event.target.value);
		} else {
			setPasswordError('');
			setPasswordWarning([]);
		}
	}

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
								onChange={handlePasswordChange}
								required
							/>
							{passwordError && (
								<div
									style={{
										background: '#FF7171',
										border: 'solid #FF0000',
										borderRadius: '25px',
										padding: '12.5px',
										margin: '5px',
									}}
								>
									<p>{passwordError}</p>
								</div>
							)}
							{passwordWarning &&
								passwordWarning.map((warning, index) => (
									<div
										key={index} // Add a unique key here
										style={{
											background: '#FFB46B',
											border: 'solid #FF7F00',
											borderRadius: '25px',
											padding: '12.5px',
											margin: '5px',
										}}
									>
										<p>{warning}</p>
									</div>
								))}
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
