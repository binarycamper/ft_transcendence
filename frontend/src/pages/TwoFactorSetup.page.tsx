import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function TwoFactorSetup() {
	const [twoFACode, setTwoFACode] = useState('');
	const [qrCodeUrl, setQrCodeUrl] = useState('');
	const [isSetup, setIsSetup] = useState(false); // Zustand, um zu überprüfen, ob es sich um eine Ersteinrichtung handelt
	const location = useLocation();
	const userId = location.state?.userId;
	console.log('userId: ', userId);
	const navigate = useNavigate();

	useEffect(() => {
		if (userId) {
			setIsSetup(true); // Es handelt sich um eine Ersteinrichtung
			handle2FASetup();
		} else {
			setIsSetup(false); // Es handelt sich um eine Verifizierung bei erneutem Login
		}
	}, [userId]);

	const handle2FASetup = async () => {
		try {
			const response = await fetch(`http://localhost:8080/auth/2fa/setup?userId=${userId}`, {
				method: 'GET',
				credentials: 'include',
			});
			const data = await response.json();
			setQrCodeUrl(data.qrCodeUrl);
			// handle2FASetup();
		} catch (error) {
			console.error('Error setting up 2FA:', error);
		}
	};

	const verify2FACode = async () => {
		const url = isSetup
			? `http://localhost:8080/auth/2fa/verify-2fa?userId=${userId}`
			: 'http://localhost:8080/auth/2fa/verify-2fa';
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					token: twoFACode,
					userId: userId,
				}),
				credentials: 'include',
			});

			if (response.status === 200) {
				navigate('/profile', {});
			} else {
				console.error('Invalid 2FA code');
			}
		} catch (error) {
			console.error('Error verifying 2FA code:', error);
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
