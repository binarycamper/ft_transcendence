import React, { useEffect, useState } from 'react';
import fetchUrl from '../services/fetchUrl';

const AllUsersPage: React.FC = () => {
	const [users, setUsers] = useState([]);
	const [selectedUser, setSelectedUser] = useState(null); // Store the selected user's data
	const [error, setError] = useState(''); // Define the setError function
	const [successMessage, setSuccessMessage] = useState(''); // Define the setSuccessMessage function

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
			setError('Invalid request');
			//console.error('Error fetching public profile:', error);
		}
	};

	const sendFriendRequest = async () => {
		if (!selectedUser) {
			// Ensure a user is selected before sending the request
			return;
		}
		const friendRequestMessage = {
			recipient: selectedUser.name, // Use the selected user's name as the recipient
			content: `Hi ${selectedUser.name}, I would like to add you as a friend!`,
			messageType: 'friend_request',
		};
		try {
			const response = await fetch(fetchUrl('8080', '/chat/friend-request'), {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(friendRequestMessage),
			});
			if (!response.ok) {
				const errorData = await response.json();
				const message = errorData.message ? errorData.message : 'Failed to send friend request.';
				setError(message);
				setSuccessMessage(''); // Clear success message if there's an error
			} else {
				const result = await response.json();
				console.log(result);
				setError(''); // Clear error message if the request is successful
				setSuccessMessage('Friend request sent successfully!');
			}
		} catch (error) {
			setError('There was an error sending the friend request.');
			//console.error(`There was an error sending the friend request: ${error}`);
		}
	};

	return (
		<div>
			<h1>All Users</h1>
			{/* Display error message */}
			{error && <p style={{ color: 'red' }}>{error}</p>}
			{/* Display success message */}
			{successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
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
					<button onClick={sendFriendRequest}>Friend request</button>
				</div>
			)}
		</div>
	);
};

export default AllUsersPage;
