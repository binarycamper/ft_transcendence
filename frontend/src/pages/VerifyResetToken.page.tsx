import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ResetPassword from './ResetPassword.page';

export default function VerifyResetToken() {
	const { token } = useParams();
	const navigate = useNavigate();
	const [isValidToken, setIsValidToken] = useState(false);

	useEffect(() => {
		const verifyToken = async () => {
			try {
				const response = await fetch(`http://localhost:8080/auth/verify-reset-token/${token}`);
				if (response.ok) {
					setIsValidToken(true);
				} else {
					navigate('/login'); // Redirect to login if token is invalid
				}
			} catch (error) {
				console.error('Error verifying token:', error);
			}
		};

		verifyToken();
	}, [token, navigate]);

	if (!isValidToken) {
		return <div>Loading...</div>;
	}

	return <ResetPassword token={token} />;
}
