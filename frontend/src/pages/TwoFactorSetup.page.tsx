import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function TwoFactorSetup() {
	const [twoFACode, setTwoFACode] = useState('');
	const [qrCodeUrl, setQrCodeUrl] = useState('');
	const [show2FASetup, setShow2FASetup] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		handle2FASetup();
	}, []);

	const handle2FASetup = async () => {
		try {
			const response = await fetch('http://localhost:8080/auth/2fa/setup', {
				method: 'GET',
				credentials: 'include',
			});
			const data = await response.json();
			setQrCodeUrl(data.qrCodeUrl);
			setShow2FASetup(true);
		} catch (error) {
			console.error('Error setting up 2FA:', error);
		}
	};

	const verify2FACode = async () => {
		try {
			const response = await fetch('http://localhost:8080/auth/2fa/verify-2fa', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					token: twoFACode,
				}),
				credentials: 'include',
			});

			console.log(response);
			if (response.status === 200) {
				await confirm2FA();
			} else {
				console.error('Invalid 2FA code');
			}
		} catch (error) {
			console.error('Error verifying 2FA code:', error);
		}
	};

	const confirm2FA = async () => {
		try {
			const response = await fetch('http://localhost:8080/auth/2fa/confirm', {
				method: 'POST',
				credentials: 'include',
			});

			if (response.ok) {
				navigate('/profile');
			} else {
				console.error('Error confirming 2FA setup');
			}
		} catch (error) {
			console.error('Error confirming 2FA setup:', error);
		}
	};

	return (
		<div>
			{qrCodeUrl && (
				<div>
					<img src={qrCodeUrl} alt="QR Code" />
					<input
						type="text"
						value={twoFACode}
						onChange={(e) => setTwoFACode(e.target.value)}
						placeholder="Enter 2FA Code"
					/>
					<button onClick={verify2FACode}>Verify 2FA Code</button>
				</div>
			)}
		</div>
	);
}
