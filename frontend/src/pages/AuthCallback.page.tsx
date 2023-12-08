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

			window.location.href = '/dashboard';
		}
	}, [location]);

	return <div>Loading...</div>;
};
export default AuthCallback;
