import React, { useContext, useEffect, useState } from 'react';
import { SocketContext } from './context/socketContext';
import { useNavigate } from 'react-router-dom';

type Friend = {
	id: string;
	name: string;
	status: string;
};

type ChatMessage = {
	id: string;
	content: string;
	senderId: string;
	receiverId: string;
	// Add any other relevant properties
};

export const ChatRoom = () => {
	const socket = useContext(SocketContext);
	const navigate = useNavigate();

	//Save User data
	const [currentUserId, setCurrentUserId] = useState(null);
	const [currentUserName, setCurrentUserName] = useState(null);

	const [friends, setFriends] = useState<Friend[]>([]);
	const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [newMessage, setNewMessage] = useState('');

	useEffect(() => {
		const getCurrentUserId = async () => {
			try {
				const response = await fetch('http://localhost:8080/user/id', {
					credentials: 'include',
				});
				if (!response.ok) {
					throw new Error('Failed to fetch current user ID');
				}
				const data = await response.json();
				setCurrentUserName(data.name);
				setCurrentUserId(data.id);
			} catch (error) {
				//console.log('Not authenticated: ', error);
				navigate('/login');
			}
		};

		getCurrentUserId();
	}, []);

	useEffect(() => {
		// Fetch friends list when component mounts
		const fetchFriends = async () => {
			try {
				const response = await fetch('http://localhost:8080/user/friends', {
					credentials: 'include',
				});
				if (!response.ok) {
					throw new Error('Failed to fetch friends');
				}
				const friendsList: Friend[] = await response.json();
				setFriends(friendsList);
			} catch (error) {
				console.error('Error fetching friends:', error);
			}
		};

		fetchFriends();
	}, []);

	const handleSelectFriend = (friend: Friend) => {
		setSelectedFriend(friend);
		//console.log('friend: ', friend);
	};

	// Effect for fetching chat history when a friend is selected
	useEffect(() => {
		if (selectedFriend) {
			fetchChatHistory(selectedFriend.id);
		}
	}, [selectedFriend]);

	const fetchChatHistory = async (selectedFriendId: string) => {
		try {
			const response = await fetch(
				`http://localhost:8080/chat/history/?friendId=${selectedFriendId}`,
				{
					method: 'GET',
					credentials: 'include',
				},
			);
			if (!response.ok) {
				throw new Error('Failed to fetch chat history');
			}
			const history = await response.json();
			//console.log('res: ', history);
			setChatMessages(history);
		} catch (error) {
			console.error('Error fetching chat history:', error);
		}
	};

	useEffect(() => {
		const handleNewMessage = (message: ChatMessage) => {
			if (
				(message.senderId === currentUserId && message.receiverId === selectedFriend?.id) ||
				(message.receiverId === currentUserId && message.senderId === selectedFriend?.id)
			) {
				//console.log('?: ', message.content);
				setChatMessages((prevMessages) => [...prevMessages, message]);
			}
		};

		socket.on('receiveMessage', handleNewMessage);

		return () => {
			socket.off('receiveMessage', handleNewMessage);
		};
	}, [socket, currentUserId, selectedFriend]);

	const handleSendMessage = () => {
		if (!newMessage.trim()) return; // Avoid sending empty messages

		const messageToSend = {
			content: newMessage,
			receiverId: selectedFriend?.id,
			// Add any other required fields
		};

		socket.emit('sendMessage', messageToSend);
		setNewMessage('');
	};

	// Function to get the display name for each message
	const getDisplayName = (senderId: string) => {
		if (senderId === currentUserId) return currentUserName;
		if (senderId === selectedFriend?.id) return selectedFriend.name;
		return 'Unknown'; // Fallback for any mismatch
	};

	const handleClearChat = async (friendId: string) => {
		const confirmation = window.confirm(
			'Clearing this chat will also clear it for your friend. Do you want to proceed?',
		);

		if (confirmation) {
			try {
				await fetch(`http://localhost:8080/chat/deleteChat?friendId=${friendId}`, {
					method: 'DELETE',
					credentials: 'include',
				});
				// Clear chat messages from the state if the selected friend's chat is being cleared
				if (selectedFriend?.id === friendId) {
					setChatMessages([]);
				}
			} catch (error) {
				console.error('Error clearing chat:', error);
			}
		}
	};

	return (
		<div>
			Current User: {currentUserName || 'Loading...'}
			<div>
				<h2>My Friends</h2>
				<ul>
					{friends.map((friend) => (
						<li
							key={friend.id}
							onClick={() => handleSelectFriend(friend)}
							style={{
								cursor: 'pointer',
								backgroundColor: selectedFriend?.id === friend.id ? 'green' : 'transparent',
							}}
						>
							<span onClick={() => handleSelectFriend(friend)}>{friend.name}</span>
							<button onClick={() => handleClearChat(friend.id)} style={{ marginLeft: '10px' }}>
								Clear Chat
							</button>
						</li>
					))}
				</ul>
				{/* Conditional rendering to check if selectedFriend is not null */}
				{selectedFriend && (
					<>
						<h2>Chat with {selectedFriend.name}</h2>
						<div
							style={{
								border: '1px solid #ccc',
								borderRadius: '8px',
								padding: '10px',
								maxHeight: '400px',
								overflowY: 'auto',
								backgroundColor: '#f9f9f9',
								margin: '10px 0',
							}}
						>
							{chatMessages.map((message) => (
								<div
									key={message.id}
									className={`message ${message.senderId === currentUserId ? 'sent' : 'received'}`}
									style={{
										backgroundColor: message.senderId === currentUserId ? '#101' : '#454',
										padding: '1px',
										borderRadius: '1px',
										margin: '2px 0',
										color: '#fff',
									}}
								>
									<p>
										<strong>{getDisplayName(message.senderId)}</strong>: {message.content}
									</p>
								</div>
							))}
						</div>
						<div style={{ display: 'flex' }}>
							<input
								type="text"
								value={newMessage}
								onChange={(e) => setNewMessage(e.target.value)}
								placeholder="Type a message..."
								style={{ flexGrow: 1 }}
							/>
							<button onClick={handleSendMessage}>Send</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
};
