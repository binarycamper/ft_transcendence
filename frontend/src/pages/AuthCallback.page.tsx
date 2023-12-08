import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const AuthCallback = () => {
	const location = useLocation();

	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const userId = queryParams.get('userId');
		const token = queryParams.get('token');

		if (userId && token) {
			localStorage.setItem('userId', userId);
			localStorage.setItem('token', token);

			// Weiterleitung zur Hauptseite oder zum Dashboard
			window.location.href = '/dashboard'; // Beispiel-Weiterleitung
		}
	}, [location]);

	return (
		<div>Loading...</div> // Oder eine andere Ladeanzeige
	);
};
export default AuthCallback;
