import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function TwoFactorSetup() {
	const [twoFACode, setTwoFACode] = useState('');
	const [qrCodeUrl, setQrCodeUrl] = useState('');
	const [show2FASetup, setShow2FASetup] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		// Aufrufen von handle2FASetup bei Komponenten-Mount
		handle2FASetup();
	}, []);

	// ... Ihre vorhandenen Funktionen: handle2FASetup, verify2FACode, confirm2FA ...
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
			// Handle errors, e.g., show an error message
		}
	};

	const verify2FACode = async () => {
		// const token = localStorage.getItem('token'); // JWT-Token
		// const userId = localStorage.getItem('userId');
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
				// Code verification successful
				await confirm2FA(); // Bestätigen des 2FA-Setups
			} else {
				// Handle unsuccessful verification
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
				// 2FA setup successfully confirmed
				// Hier können Sie weitere Aktionen durchführen, wie z.B. den Benutzer zur Profilseite weiterleiten
				navigate('/profile');
			} else {
				// Handle error in 2FA confirmation
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
