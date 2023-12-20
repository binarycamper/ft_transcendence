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
			console.log('res: ', history);
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
				setChatMessages((prevMessages) => [...prevMessages, message]);
			}
		};

		socket.on('receiveMessage', handleNewMessage);

		return () => {
			socket.off('receiveMessage', handleNewMessage);
		};
	}, [socket, currentUserId, selectedFriend]);

	return (
		<div>
			Current User: {currentUserName ? currentUserName : 'Loading...'}
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
							{friend.name}
						</li>
					))}
				</ul>
				<h2>Chat with {selectedFriend?.name}</h2>
				<div style={{ maxHeight: '400px', overflowY: 'auto' }}>
					{chatMessages.map((message) => (
						<div
							key={message.id}
							className={`message ${message.senderId === currentUserId ? 'sent' : 'received'}`}
						>
							<p>{message.content}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
