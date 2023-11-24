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
					// If the response is not ok, navigate to the login
					navigate('/login', {
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

	const handleDelete = async () => {
		// Confirm with the user before sending the delete request
		if (
			window.confirm(
				'Are you sure you want to delete your account? This action cannot be undone.',
			)
		) {
			try {
				// Send the delete request to the server
				const response = await fetch(
					'http://localhost:8080/user/delete?confirm=true',
					{
						method: 'DELETE',
						credentials: 'include', // Ensures cookies are sent with the request
					},
				);

				// Handle non-OK responses from the server
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				// Read the server's response json
				const result = await response.json();
				console.log('Account deletion successful:', result);
				localStorage.clear(); // This clears everything in local storage
				localStorage.removeItem('token');
				// Navigate to a different page upon successful deletion
				navigate('/'); // Make sure to have this route configured in your router
			} catch (error) {
				console.error('There was an error deleting the account:', error);
			}
		}
	};

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
			<button onClick={handleDelete}>Delete My Account</button>
		</div>
	);
}
