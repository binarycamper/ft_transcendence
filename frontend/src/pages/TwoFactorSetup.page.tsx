import { useState, useEffect } from 'react';
import { Form, useNavigate } from 'react-router-dom';
import fetchUrl from '../services/fetchUrl';

export function TwoFactorSetup() {
	const [twoFACode, setTwoFACode] = useState('');
	const [qrCodeUrl, setQrCodeUrl] = useState('');
	const [errorMessage, setErrorMessage] = useState('');
	const [isSetup, setIsSetup] = useState(false);
	const [userId, setUserId] = useState('');
	const navigate = useNavigate();

	useEffect(() => {
		async function fetchProfile() {
			const response = await fetch(fetchUrl('8080','/user/id'), {
				method: 'GET',
				credentials: 'include',
			});
			const data = await response.json();

			if (data.id) {
				setUserId(data.id);
			}
		}
		fetchProfile();
	}, [userId]);

	useEffect(() => {
		if (userId) {
			setIsSetup(true); // Es handelt sich um eine Ersteinrichtung
			handle2FASetup();
		} else {
			setIsSetup(false); // Es handelt sich um eine Verifizierung bei erneutem Login
		}
	}, [userId]);

	async function handle2FASetup() {
		try {
			const response = await fetch(fetchUrl('8080','/auth/2fa/setup'), {
				method: 'GET',
				credentials: 'include',
			});
			const data = await response.json();
			if (data.qrCodeUrl === null) {
				return;
			}
			setQrCodeUrl(data.qrCodeUrl);
			// handle2FASetup();
		} catch (error) {
			console.error('Error setting up 2FA:', error);
		}
	}

	async function verify2FACode() {
		const url = fetchUrl('8080','/auth/2fa/verify-2fa');
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					token: twoFACode,
				}),
				credentials: 'include',
			});

			if (response.ok) {
				navigate('/profile', {});
			} else {
				console.error('Invalid 2FA code');
				setErrorMessage('Invalid 2FA code');
			}
		} catch (error) {
			console.error('Error verifying 2FA code:', error);
		}
	}

	return (
		<div>
			{qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" />}
			<Form onSubmit={verify2FACode}>
				<input
					type="text"
					value={twoFACode}
					onChange={(e) => setTwoFACode(e.target.value)}
					placeholder="Enter 2FA Code"
				/>
				<p style={{ color: 'red' }}>{errorMessage}</p>
				<button onClick={verify2FACode}>Verify 2FA Code</button>
			</Form>
		</div>
	);
}
