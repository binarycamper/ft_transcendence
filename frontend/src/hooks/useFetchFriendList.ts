import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ChatRequest = {
	content: string;
	id: string;
	messageType: 'friend_request' | 'system_message';
	receiverId: string;
	senderId: string;
	senderName: string;
	status: 'accepted' | 'declined' | 'pending';
};

type Friend = {
	email: string;
	id: string;
	customImage: string;
	intraImage: string;
	ladderLevel: number;
	gamesLost: number;
	name: string;
	nickname: string;
	status: string;
	gamesWon: number;
};

export default function useFetchFriendList() {
	const navigate = useNavigate();
	const [error, setError] = useState('');
	const [friendProfile, setFriendProfile] = useState<Friend | null>(null);
	const [friends, setFriends] = useState<Friend[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [newFriendName, setNewFriendName] = useState('');
	const [pendingRequestCount, setPendingRequestCount] = useState(0);
	const [successMessage, setSuccessMessage] = useState('');

	useEffect(() => {
		async function fetchPendingRequestsCount() {
			setIsLoading(true);
			try {
				const response = await fetch('http://localhost:8080/chat/pendingrequests', {
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
				console.error(`Error fetching messages: ${error}`);
			} finally {
				setIsLoading(false);
			}
		}

		fetchFriends();
		fetchPendingRequestsCount();
	}, []);

	// useCallback()
	async function fetchFriends() {
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
			console.error(`There was an error fetching the friends: ${error}`);
		} finally {
			setIsLoading(false);
		}
	}

	async function addFriend() {
		if (!newFriendName) {
			setError('Please enter the name of the friend you want to add.');
			return;
		}
		if (newFriendName.length > 100) {
			setNewFriendName('');
			setError('The entered name is too long.');
			return;
		}
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
				const errorData = await response.json();
				setError(errorData.message || 'Failed to send friend request.');
			} else {
				const result = await response.json();
				console.log(result);
				setNewFriendName('');
				setError('');
				setSuccessMessage('Friend request sent successfully!');
			}
		} catch (error) {
			setError('There was an error sending the friend request.');
			console.error(`There was an error sending the friend request: ${error}`);
		}
	}

	async function handleFriendClick(friendName: string) {
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

			const friendProfileData: Friend = await response.json();
			setFriendProfile(friendProfileData);
		} catch (error) {
			console.error(`There was an error fetching the friend profile: ${error}`);
		}
	}

	async function removeFriend(event: React.MouseEvent, friendId: string) {
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
				setSuccessMessage('Friend removed successfully!');
			} else {
				const result = await response.json();
				console.log(result.message);
			}
		} catch (error) {
			setError('Failed to remove friend');
			console.error(`There was an error removing the friend: ${error}`);
		}
	}

	return {
		addFriend,
		error,
		friendProfile,
		friends,
		handleFriendClick,
		isLoading,
		newFriendName,
		pendingRequestCount,
		removeFriend,
		setNewFriendName,
		successMessage,
	};
}
