import React, { useEffect, useState } from 'react';
import FriendProfile from '../components/Header/ProfileComponent';
import { useNavigate } from 'react-router-dom';

type Friend = {
	id: string;
	name: string;
	status: string;
	// Add any other properties that your Friend entity might have
};

export function FriendList() {
	const [friends, setFriends] = useState<Friend[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [newFriendName, setNewFriendName] = useState<string>('');
	const [friendProfile, setFriendProfile] = useState(null);
	const [successMessage, setSuccessMessage] = useState('');
	const navigate = useNavigate();

	useEffect(() => {
		fetchFriends();
	}, []);

	const fetchFriends = async () => {
		try {
			setIsLoading(true);
			const response = await fetch('http://localhost:8080/user/friends', {
				method: 'GET',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				navigate('/login');
			}

			const data = await response.json();

			setFriends(data);
		} catch (error) {
			setError('Failed to load friends');
			console.error('There was an error fetching the friends:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const addFriend = async () => {
		if (!newFriendName) {
			setError('Please enter the name of the friend you want to add.');
			return;
		}

		// You may need to adjust the size check based on your requirements
		if (newFriendName.length > 100) {
			setNewFriendName(''); // Reset input field
			setError('The entered name is too long.');
			return;
		}

		// Construct the friend request message
		const friendRequestMessage = {
			recipient: newFriendName,
			content: `Hi ${newFriendName}, I would like to add you as a friend!`,
			messageType: 'friend_request',
		};

		try {
			// Send the friend request message to the server
			const response = await fetch('http://localhost:8080/chat/friendrequest', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(friendRequestMessage),
			});

			if (!response.ok) {
				throw new Error(`Network response was not ok. Status: ${response.status}`);
			}

			// Handle the response here. For example, you might want to show a success message or update the UI
			const result = await response.json();
			console.log(result.message); // Assuming the server sends back a success message
			setNewFriendName(''); // Reset input field after successful request
			setError(null); // Clear any existing errors
			setSuccessMessage('Friend request sent successfully!'); // Set success message
		} catch (error) {
			setError('Failed to send friend request');
			console.error('There was an error sending the friend request:', error);
		}
	};

	const handleFriendClick = async (friendName: string) => {
		try {
			const response = await fetch(
				`http://localhost:8080/user/publicprofile?friendname=${friendName}`,
				{
					method: 'GET',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);

			if (!response.ok) {
				throw new Error('Network response was not ok');
			}

			const friendProfileData = await response.json();
			setFriendProfile(friendProfileData);
		} catch (error) {
			console.error('There was an error fetching the friend profile:', error);
		}
	};

	const removeFriend = async (event: React.MouseEvent, friendId: string) => {
		event.stopPropagation();
		try {
			const response = await fetch(`http://localhost:8080/user/friends/?friendid=${friendId}`, {
				method: 'DELETE',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error(`Network response was not ok. Status: ${response.status}`);
			}

			// If the response status code is 204 No Content, then don't try to parse the response as JSON
			if (response.status === 204) {
				console.log('Friend removed successfully.');

				// Update the UI by filtering out the removed friend
				setFriends((prevFriends) => prevFriends.filter((friend) => friend.id !== friendId));
				await fetchFriends();
				setSuccessMessage('Friend removed successfully!'); // Set success message
			} else {
				// If you expect a JSON message even on successful delete, parse it here
				const result = await response.json();
				console.log(result.message);
			}
		} catch (error) {
			setError('Failed to remove friend'); // Set error message
			console.error('There was an error removing the friend:', error);
		}
	};

	return (
		<div>
			<h1>My Friends</h1>
			{/* Input and button to add a new friend */}
			<input
				type="text"
				placeholder="Enter friend's name"
				value={newFriendName}
				onChange={(e) => setNewFriendName(e.target.value)}
			/>
			<button onClick={addFriend}>Add New Friend</button>
			{successMessage && <p className="success">{successMessage}</p>}
			{error && <p>{error}</p>}
			{isLoading ? (
				<p>Loading...</p>
			) : (
				<>
					<ul>
						{friends.map((friend) => (
							<li
								key={friend.id}
								onClick={() => handleFriendClick(friend.name)}
								style={{ cursor: 'pointer' }}
							>
								{friend.name} - {friend.status}
								{/* Pass the event object to the removeFriend function */}
								<button onClick={(e) => removeFriend(e, friend.id)}>Remove</button>
							</li>
						))}
					</ul>
					{/* Render the FriendProfile component with the friendProfile data */}
					{friendProfile && <FriendProfile profile={friendProfile} />}
				</>
			)}
		</div>
	);
}
