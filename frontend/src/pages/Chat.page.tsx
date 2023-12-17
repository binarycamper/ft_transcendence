import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const listStyles: React.CSSProperties = {
	listStyle: 'none',
	padding: '0',
};

const listItemStyles: React.CSSProperties = {
	marginBottom: '0.5rem',
};

type Friend = {
	id: string;
	name: string;
	status: string;
};

const overlayStyle: React.CSSProperties = {
	position: 'absolute',
	backgroundColor: 'rgba(255, 255, 255, 0.9)',
	padding: '10px',
	borderRadius: '5px',
	boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
	zIndex: 1000,
	top: '50%',
	left: '50%',
	transform: 'translate(-50%, -50%)',
	minWidth: '150px',
};

const pendingRequestsStyle: React.CSSProperties = {
	backgroundColor: '#007bff',
	color: 'white',
	borderRadius: '50%',
	padding: '0.5em',
	marginLeft: '10px',
	fontSize: '0.8em',
	display: 'inline-block',
	minWidth: '1.5em',
	textAlign: 'center',
	lineHeight: '1.5em',
};

const buttonStyleBase: React.CSSProperties = {
	border: 'none',
	padding: '8px 16px',
	borderRadius: '15px',
	cursor: 'pointer',
	fontWeight: 'bold',
	textTransform: 'uppercase',
	letterSpacing: '0.05em',
	boxShadow: '0 2px 5px rgba(0,0,0,0.2)', // subtle shadow for depth
	margin: '5px',
	transition: 'all 0.3s ease', // smooth transition for hover effects
};

type ChatMessage = {
	id: string;
	senderName: string;
	senderId: string;
	receiverId: string;
	messageType: 'friend_request' | 'system_message';
	content: string;
	status: 'pending' | 'accepted' | 'declined';
};

type SelectedFriend = {
	id: string;
	name: string;
} | null;

export function Chat() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [pendingRequestCount, setPendingRequestCount] = useState(0);
	const [myRequests, setMyRequests] = useState<ChatMessage[]>([]);
	const [friends, setFriends] = useState<Friend[]>([]);
	const [selectedFriend, setSelectedFriend] = useState<SelectedFriend>(null);
	const navigate = useNavigate();

	useEffect(() => {
		fetchPendingRequests();
		fetchMyRequests();
		fetchFriends();
	}, []);

	const fetchPendingRequests = async () => {
		setIsLoading(true);
		try {
			const response = await fetch('http://localhost:8080/chat/pendingrequests', {
				credentials: 'include',
			});
			if (!response.ok) {
				navigate('/login');
				return;
			}
			const data: ChatMessage[] = await response.json();
			setMessages(data);

			const pendingRequests = data.filter((message) => message.status === 'pending');
			setPendingRequestCount(pendingRequests.length);
		} catch (error) {
			console.error('Error fetching messages:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchMyRequests = async () => {
		setIsLoading(true);
		try {
			const response = await fetch('http://localhost:8080/chat/myrequests', {
				credentials: 'include',
			});
			if (!response.ok) {
				navigate('/login');
				return;
			}
			const data: ChatMessage[] = await response.json();
			setMyRequests(data); // Update state with your own requests
		} catch (error) {
			console.error('Error fetching my requests:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// Add your fetchFriends function here
	// This is a placeholder function, update it with actual API call and logic
	const fetchFriends = async () => {
		// TODO: Replace with actual logic to fetch friends
		const dummy = [
			// Dummy data for example
			{ id: '1', name: 'Alice', status: 'online' },
			{ id: '2', name: 'Bob', status: 'offline' },
		];
		setFriends(dummy);
	};

	const handleAction = async (messageId: string, action: string) => {
		try {
			const response = await fetch(`http://localhost:8080/chat/${action}/?messageid=${messageId}`, {
				method: 'POST',
				credentials: 'include',
			});
			if (!response.ok) throw new Error('Failed to update message status');
			fetchPendingRequests();
		} catch (error) {
			console.error('Error updating message:', error);
		}
	};

	const handleFriendClick = (friend: Friend) => {
		setSelectedFriend({ id: friend.id, name: friend.name });
	};

	const sendMessage = async () => {
		if (selectedFriend) {
			// Here you would implement the actual logic to send a message
			console.log(`Send message to ${selectedFriend.name}`);
			// For now, we'll just reset the selected friend
			setSelectedFriend(null);
		}
	};

	// Function to send an invite (placeholder function for now)
	const sendInvite = async () => {
		if (selectedFriend) {
			// Here you would implement the actual logic to send an invite
			console.log(`Send invite to ${selectedFriend.name}`);
			// For now, we'll just reset the selected friend
			setSelectedFriend(null);
		}
	};

	// Overlay component for the selected friend
	const FriendOverlay = () => {
		if (!selectedFriend) return null;

		return (
			<div style={overlayStyle}>
				<h3>{selectedFriend.name}</h3>
				<button onClick={sendMessage}>Send Message</button>
				<button onClick={sendInvite}>Invite</button>
				<button onClick={() => setSelectedFriend(null)}>Close</button>
			</div>
		);
	};

	const acceptButtonStyle: React.CSSProperties = {
		...buttonStyleBase,
		backgroundColor: '#28a745', // Bootstrap green
	};

	const declineButtonStyle: React.CSSProperties = {
		...buttonStyleBase,
		backgroundColor: '#dc3545', // Bootstrap red
	};

	return (
		<div style={{ position: 'relative' }}>
			<h1>
				Open Requests:{' '}
				{pendingRequestCount > 0 && <span style={pendingRequestsStyle}>{pendingRequestCount}</span>}
			</h1>
			{isLoading ? (
				<p>Loading...</p>
			) : (
				<>
					<div style={{ float: 'left', width: '50%' }}>
						{/* Render messages here */}
						<ul>
							{messages.map((message) => (
								<li key={message.id}>
									{message.messageType === 'friend_request' ? (
										<p>{message.senderName} sent a friend request.</p>
									) : (
										<p>{message.content}</p>
									)}
									{message.messageType === 'friend_request' && (
										<div>
											<button
												style={acceptButtonStyle}
												onClick={() => handleAction(message.id, 'accept')}
											>
												Accept
											</button>
											<button
												style={declineButtonStyle}
												onClick={() => handleAction(message.id, 'decline')}
											>
												Decline
											</button>
										</div>
									)}
								</li>
							))}
						</ul>
						{/* Render myRequests here */}
						<h2>My Requests:</h2>
						<ul>
							{myRequests.map((request) => (
								<li key={request.id}>
									<p>
										To: {request.receiverId} - {request.content} (Status: {request.status})
									</p>
								</li>
							))}
						</ul>
					</div>
					<div style={{ float: 'right', width: '50%' }}>
						{/* Render friend list here */}
						<h2>My Friends:</h2>
						<ul style={listStyles}>
							{friends.map((friend) => (
								<li
									key={friend.id}
									style={listItemStyles}
									onClick={() => handleFriendClick(friend)}
								>
									{friend.name} - {friend.status}
								</li>
							))}
						</ul>
					</div>
					{selectedFriend && <FriendOverlay />}
				</>
			)}
		</div>
	);
}
