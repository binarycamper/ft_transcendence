import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type UserProfile = {
	name: string;
	email: string;
	status: string;
	intraId: number;
	// Include other properties as needed
};

export function Profile() {
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const response = await fetch('http://localhost:8080/user/profile', {
					credentials: 'include',
				});
				if (!response.ok) {
					// If the response is not ok, navigate to the error page with the status text
					navigate('/error', { state: { statusText: response.statusText } });
					return;
				}
				const data: UserProfile = await response.json();
				setProfile(data);
			} catch (error) {
				console.error(error);
				// Navigate to the error page with error message if there is a network error
				const message = (error as Error).message || 'An error occurred';

				navigate('/error', { state: { message } });
			}
		};

		fetchProfile();
	}, [navigate]);

	if (!profile) {
		return <div>Loading profile...</div>;
	}

	return (
		<div>
			<h1>Profile</h1>
			<p>Name: {profile.name}</p>
			<p>Email: {profile.email}</p>
			<p>Status: {profile.status}</p>
			<p>IntraId: {profile.intraId}</p>
			{/* Display other user profile data here */}
		</div>
	);
}
