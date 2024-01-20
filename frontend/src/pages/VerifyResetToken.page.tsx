import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ResetPassword from './ResetPassword.page';
import fetchUrl from '../services/fetchUrl';

export default function VerifyResetToken() {
	const { token } = useParams();
	const navigate = useNavigate();
	const [isValidToken, setIsValidToken] = useState(false);
	const [info, setinfo] = useState('');

	useEffect(() => {
		async function verifyToken() {
			try {
				const response = await fetch(fetchUrl('8080', `/auth/verify-reset-token/${token}`));
				if (response.ok) {
					setIsValidToken(true);
				} else {
					navigate('/login'); // Redirect to login if token is invalid
				}
			} catch (error) {
				//console.error('Error verifying token:', error);
				setinfo('Invalid Token');
			}
		}

		verifyToken();
	}, [token, navigate]);

	if (!isValidToken) {
		return (
			<div>
				<div>Loading...</div>
				{info && <div>{info}</div>} {/* Render info if it is not empty */}
			</div>
		);
	}

	return <ResetPassword token={token} />;
}
