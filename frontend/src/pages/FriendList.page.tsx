import React, { useEffect, useState } from 'react';
import FriendProfile from '../components/Header/ProfileComponent';
import { useNavigate } from 'react-router-dom';

type Friend = {
	id: string;
	name: string;
	status: string;
};

type ChatRequest = {
	id: string;
	senderName: string;
	senderId: string;
	receiverId: string;
	messageType: 'friend_request' | 'system_message';
	content: string;
	status: 'pending' | 'accepted' | 'declined';
};

const styles: { [key: string]: React.CSSProperties } = {
	container: {
		padding: '20px',
		backgroundColor: 'transparent',
	},
	heading: {
		color: '#fff',
	},
	friendRequestNotification: {
		cursor: 'pointer',
		color: 'white',
		backgroundColor: '#17a2b8',
		padding: '10px',
		borderRadius: '5px',
		margin: '10px 0',
		textAlign: 'center',
		width: 'auto',
		display: 'inline-block',
	},
	input: {
		padding: '10px',
		marginRight: '10px',
		borderRadius: '5px',
		border: '1px solid #ddd',
	},
	addButton: {
		backgroundColor: '#28a745',
		color: 'white',
		padding: '10px 20px',
		border: 'none',
		borderRadius: '5px',
		cursor: 'pointer',
	},
	successMessage: {
		color: '#28a745',
	},
	errorMessage: {
		color: '#dc3545',
	},
	friendListItem: {
		cursor: 'pointer',
		backgroundColor: 'transparent',
		padding: '10px',
		margin: '10px 0',
		borderRadius: '5px',
		boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
	},
	removeButton: {
		backgroundColor: '#dc3545',
		color: 'white',
		padding: '5px 10px',
		border: 'none',
		borderRadius: '5px',
		cursor: 'pointer',
		marginLeft: '10px',
	},
};

export function FriendList() {
	const [friends, setFriends] = useState<Friend[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [newFriendName, setNewFriendName] = useState('');
	const [friendProfile, setFriendProfile] = useState(null);
	const [successMessage, setSuccessMessage] = useState('');
	const [pendingRequestCount, setPendingRequestCount] = useState(0);
	const navigate = useNavigate();

	useEffect(() => {
		fetchFriends();
		fetchPendingRequestsCount();
	}, []);

	const fetchPendingRequestsCount = async () => {
		setIsLoading(true);
		try {
			const response = await fetch('http://localhost:8080/chat/requests', {
				credentials: 'include',
			});
			if (!response.ok) {
				navigate('/login');
				return;
			}
			const data: ChatRequest[] = await response.json();

			const pendingRequests = data.filter((message) => message.status === 'pending');
			setPendingRequestCount(pendingRequests.length);
		} catch (error) {
			console.error('Error fetching messages:', error);
		} finally {
			setIsLoading(false);
		}
	};

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
			const result: [] = await response.json();
			console.log(result);
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

	const navigateToChat = () => {
		navigate('/chat');
	};

	return (
		<div style={styles.container}>
			<h1 style={styles.heading}>My Friends</h1>
			{pendingRequestCount > 0 && (
				<div onClick={navigateToChat} style={styles.friendRequestNotification}>
					You have {pendingRequestCount} friend request(s). Click here to review.
				</div>
			)}
			<div style={{ margin: '20px 0' }}>
				<input
					type="text"
					placeholder="Enter friend's name"
					value={newFriendName}
					onChange={(e) => setNewFriendName(e.target.value)}
					style={styles.input}
				/>
				<button onClick={addFriend} style={styles.addButton}>
					Add New Friend
				</button>
			</div>
			{successMessage && (
				<p className="success" style={styles.successMessage}>
					{successMessage}
				</p>
			)}
			{error && <p style={styles.errorMessage}>{error}</p>}
			{isLoading ? (
				<p>Loading...</p>
			) : (
				<ul style={{ listStyleType: 'none', padding: 0 }}>
					{friends.map((friend) => (
						<li
							key={friend.id}
							onClick={() => handleFriendClick(friend.name)}
							style={styles.friendListItem}
						>
							{friend.name} - {friend.status}
							<button onClick={(e) => removeFriend(e, friend.id)} style={styles.removeButton}>
								Remove
							</button>
						</li>
					))}
				</ul>
			)}
			{friendProfile && <FriendProfile profile={friendProfile} />}
		</div>
	);
}
