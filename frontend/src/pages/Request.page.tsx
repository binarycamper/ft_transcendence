import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import fetchUrl from '../services/fetchUrl';

const listStyles: React.CSSProperties = {
	listStyle: 'none',
	padding: '0',
};

const listItemStyles: React.CSSProperties = {
	marginBottom: '0.5rem',
	cursor: 'pointer',
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

type FriendRequestMessage = {
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

type FriendOverlayProps = {
	style: React.CSSProperties;
	selectedFriend: SelectedFriend;
	openChat: () => Promise<void>;
	sendInvite: () => Promise<void>;
	closeOverlay: () => void;
};

const FriendOverlay = React.memo(
	({ style, selectedFriend, openChat, sendInvite, closeOverlay }: FriendOverlayProps) => {
		if (!selectedFriend) return null;

		return (
			<div style={{ ...overlayStyle, ...style }}>
				<h3>{selectedFriend.name}</h3>
				<button onClick={openChat}>Open Chat</button>
				<button onClick={sendInvite}>Invite</button>
				<button onClick={closeOverlay}>Close</button>
			</div>
		);
	},
);

export function FriendRequest() {
	const [messages, setMessages] = useState<FriendRequestMessage[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [pendingRequestCount, setPendingRequestCount] = useState(0);
	const [myRequests, setMyRequests] = useState<FriendRequestMessage[]>([]);
	const [friends, setFriends] = useState<Friend[]>([]);
	const [selectedFriend, setSelectedFriend] = useState<SelectedFriend>(null);
	const [overlayTop, setOverlayTop] = useState(0);
	const [overlayLeft, setOverlayLeft] = useState(0);
	const navigate = useNavigate();

	useEffect(() => {
		fetchPendingRequests();
		fetchMyRequests();
		fetchFriends();
	}, []);

	async function fetchPendingRequests() {
		setIsLoading(true);
		try {
			const response = await fetch(fetchUrl('8080','/chat/pending-requests'), {
				credentials: 'include',
			});
			if (!response.ok) {
				navigate('/login');
				return;
			}
			const data: FriendRequestMessage[] = await response.json();
			setMessages(data);

			const pendingRequests = data.filter((message) => message.status === 'pending');
			setPendingRequestCount(pendingRequests.length);
		} catch (error) {
			console.error('Error fetching messages:', error);
		} finally {
			setIsLoading(false);
		}
	}

	async function fetchMyRequests() {
		setIsLoading(true);
		try {
			const response = await fetch(fetchUrl('8080','/chat/my-requests'), {
				credentials: 'include',
			});
			if (!response.ok) {
				navigate('/login');
				return;
			}
			const data: FriendRequestMessage[] = await response.json();
			setMyRequests(data); // Update state with your own requests
		} catch (error) {
			console.error('Error fetching my requests:', error);
		} finally {
			setIsLoading(false);
		}
	}

	async function fetchFriends() {
		setIsLoading(true);
		try {
			// Update the URL with the correct endpoint for fetching friends
			const response = await fetch(fetchUrl('8080','/user/friends'), {
				method: 'GET',
				credentials: 'include', // For session cookies, if required
				headers: {
					'Content-Type': 'application/json',
					// Include other headers if required by your backend
				},
			});

			if (!response.ok) {
				navigate('/login');
				return;
			}

			const data = await response.json();
			setFriends(data);
		} catch (error) {
			console.error('Error fetching friends:', error);
		} finally {
			setIsLoading(false);
		}
	}

	async function handleAction(messageId: string, action: string) {
		try {
			const response = await fetch(fetchUrl('8080',`/chat/${action}/?messageid=${messageId}`), {
				method: 'POST',
				credentials: 'include',
			});
			if (!response.ok) throw new Error('Failed to update message status');
			fetchPendingRequests();
			fetchFriends();
		} catch (error) {
			console.error('Error updating message:', error);
		}
	}

	const handleFriendClick = useCallback(
		(friend: Friend, event: React.MouseEvent<HTMLLIElement>) => {
			const listItem = event.currentTarget;
			const listItemRect = listItem.getBoundingClientRect();

			// Calculate the position for the overlay
			const desiredOffsetX = -450; // Adjust this value as needed for X axis offset
			const desiredOffsetY = listItem.offsetHeight / 2; // Center it vertically relative to the list item
			setOverlayTop(listItemRect.top + window.scrollY + desiredOffsetY);
			setOverlayLeft(listItemRect.left + listItemRect.width + desiredOffsetX);

			setSelectedFriend({ id: friend.id, name: friend.name });
		},
		[],
	);

	const openChat = useCallback(async () => {
		if (selectedFriend) {
			await new Promise<void>((resolve) => {
				// Perform your asynchronous operations here, then resolve the promise
				window.location.href = '/chatroom';
				resolve(undefined); // Pass 'undefined' to satisfy the type requirement
			});
		}
	}, [selectedFriend]);

	const sendInvite = useCallback(() => {
		if (selectedFriend) {
			socket.emit('game-invite', { friendId: selectedFriend.id });
			console.log('Game invite sent to socket server');
		}
	}, [selectedFriend]);

	const goToBlocklist = useCallback(() => {
		navigate('/blocklist');
	}, [navigate]);

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
			<button onClick={goToBlocklist} style={buttonStyleBase}>
				View Blocklist
			</button>
			<h1>
				Open Requests:{' '}
				{pendingRequestCount > 0 && <span style={pendingRequestsStyle}>{pendingRequestCount}</span>}
			</h1>
			{isLoading ? (
				<p>Loading...</p>
			) : (
				<>
					<div style={{ float: 'left', width: '50%' }}>
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
						<h2>My Friends:</h2>
						<ul style={listStyles}>
							{friends.map((friend) => (
								<li
									key={friend.id}
									style={listItemStyles}
									onClick={(event) => handleFriendClick(friend, event)}
								>
									{friend.name} - {friend.status}
								</li>
							))}
						</ul>
					</div>
					{selectedFriend && (
						<FriendOverlay
							style={{
								position: 'fixed',
								top: overlayTop,
								left: overlayLeft,
							}}
							selectedFriend={selectedFriend}
							openChat={openChat}
							sendInvite={sendInvite}
							closeOverlay={() => setSelectedFriend(null)}
						/>
					)}
				</>
			)}
		</div>
	);
}
