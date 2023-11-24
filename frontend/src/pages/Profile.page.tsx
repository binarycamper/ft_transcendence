import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type UserProfile = {
	name: string;
	email: string;
	status: string;
	intraId: number;
	imageUrl: string; // Add this line to include the imageUrl in your type definition
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
					// If the response is not ok, navigate to the signin
					navigate('/signup', {
						state: { statusText: response.statusText },
					});
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
			<img src={profile.imageUrl} alt={`${profile.name}'s profile`} />{' '}
			{/* Add this line to render the image */}
			<p>Name: {profile.name}</p>
			<p>Email: {profile.email}</p>
			<p>Status: {profile.status}</p>
			<p>IntraId: {profile.intraId}</p>
			{/* Display other user profile data here */}
		</div>
	);
}
