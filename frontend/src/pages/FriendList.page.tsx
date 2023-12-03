import React, { useEffect, useState } from 'react';
import FriendProfile from '../components/Header/ProfileComponent';

type Friend = {
	id: string;
	name: string;
	// Add any other properties that your Friend entity might have
};

export function FriendList() {
	const [friends, setFriends] = useState<Friend[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [newFriendName, setNewFriendName] = useState<string>('');
	const [friendProfile, setFriendProfile] = useState(null);

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
				throw new Error('Network response was not ok');
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
		try {
			const response = await fetch('http://localhost:8080/user/addFriend', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ friendName: newFriendName }), // Send the friend's name in the request body
			});

			if (!response.ok) {
				throw new Error('Network response was not ok');
			}

			// After adding a friend, you may want to update the friend list
			await fetchFriends();
			setNewFriendName(''); // Reset input field after successful addition
		} catch (error) {
			setError('Failed to add friend');
			console.error('There was an error adding the friend:', error);
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
						// Include authorization headers if needed
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
			// Handle errors here
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
								{friend.name}
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
