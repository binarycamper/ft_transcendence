import React, { useEffect, useState } from 'react';
import fetchUrl from '../services/fetchUrl';

const AllUsersPage: React.FC = () => {
	const [users, setUsers] = useState([]);
	const [selectedUser, setSelectedUser] = useState(null); // Store the selected user's data

	useEffect(() => {
		async function fetchUsers() {
			try {
				const response = await fetch(
					fetchUrl('8080', '/user/users'), // Replace with the appropriate API endpoint
					{
						method: 'GET',
						credentials: 'include',
						headers: {
							'Content-Type': 'application/json',
						},
					},
				);

				if (!response.ok) {
					throw new Error('Failed to fetch user data');
				}

				const data = await response.json();
				setUsers(data);
			} catch (error) {
				console.error('Error fetching users:', error);
			}
		}

		fetchUsers();
	}, []);

	// Function to fetch the public profile data of a selected user
	const fetchPublicProfile = async (userName) => {
		try {
			const response = await fetch(
				fetchUrl('8080', `/user/public-profile?friendname=${userName}`), // Replace with the appropriate API endpoint
				{
					method: 'GET',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);

			if (!response.ok) {
				throw new Error('Failed to fetch public profile data');
			}

			const data = await response.json();
			setSelectedUser(data);
		} catch (error) {
			console.error('Error fetching public profile:', error);
		}
	};

	const sendGameInvite = async () => {
		try {
			// TODO: send Game invite when richi got game working....
			const response = await fetch(
				fetchUrl('8080', 'send-Game-Invite'), // Replace with your API endpoint
				{
					method: 'POST', // or 'GET', 'PUT', etc. depending on your API
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
					// Add request body if needed
				},
			);

			if (!response.ok) {
				throw new Error('Failed to send fetch call');
			}
		} catch (error) {
			console.error('Error sending fetch call:', error);
		}
	};

	return (
		<div>
			<h1>All Users</h1>
			{users.map((user) => (
				<div key={user.id}>
					{/* Render user data here */}
					<p>User ID: {user.id}</p>
					<p>Name: {user.name}</p>
					<button onClick={() => fetchPublicProfile(user.name)}>View Public Profile</button>
					{/* Add more user properties as needed */}
				</div>
			))}
			{/* Display the selected user's public profile */}
			{selectedUser && (
				<div>
					<h2>Public Profile</h2>
					<p>Name: {selectedUser.name}</p>
					<p>Nickname: {selectedUser.nickname}</p>
					<p>Email: {selectedUser.email}</p>
					<p>Status: {selectedUser.status}</p>
					{/* Display customImage or intraImage based on availability */}
					<img
						src={selectedUser.customImage ? selectedUser.customImage : selectedUser.intraImage}
					/>
					{/* Button to trigger the fetch call */}
					<button onClick={sendGameInvite}>Game Invite</button>
				</div>
			)}
		</div>
	);
};

export default AllUsersPage;
