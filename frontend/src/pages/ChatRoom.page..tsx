import React, { useContext, useEffect, useState } from 'react';
import { SocketContext } from './context/socketContext';
import { useSearchParams } from 'react-router-dom';

type ChatMessage = {
	id: string;
	content: string;
	senderId: string;
};

type Friend = {
	id: string;
	name: string;
	// Add other relevant friend properties
};

const friendsListStyle = {
	listStyleType: 'none',
	padding: 0,
	margin: 0,
};

const friendItemStyle = {
	cursor: 'pointer',
	padding: '10px',
	borderBottom: '1px solid #ccc',
};

// Styles for the button
const buttonStyle = {
	marginLeft: '10px',
	padding: '2px 6px',
	fontSize: '0.7em',
	lineHeight: '1',
	alignSelf: 'center', // Align self is used to align the button when using flex on the parent
};

export const ChatRoom = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const friendId = searchParams.get('friendId');
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const socket = useContext(SocketContext);
	const [inputValue, setInputValue] = useState('');
	const [friends, setFriends] = useState<Friend[]>([]);
	const [chat, setChat] = useState('');

	// Listen for messages from the server
	/*useEffect(() => {
		const getMessage = (message: ChatMessage) => {
			setMessages((prevMessages) => [...prevMessages, message]);
			setChat(chat + message.content + '\n');
		};

		socket.on('getMessage', getMessage);

		// Clean up the listener when the component unmounts
		return () => {
			socket.off('getMessage', getMessage);
		};
	}, [socket, chat]);*/

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
				const friendsList = await response.json();
				//console.log('Friends: ', friendsList);
				setFriends(friendsList);
			} catch (error) {
				console.error('Error fetching friends:', error);
			}
		};

		fetchFriends();
	}, []);

	// Clear the input field after sending the message
	const handleSendMessage = () => {
		//TODO: Verify input!
		if (!inputValue) {
			return; // Don't send an empty message
		}
		socket.emit('sendMessage', {
			content: inputValue,
			receiverId: friendId,
		});
		setInputValue(''); // Clear the input field after sending the message
	};

	const deleteMyChats = async (friendId: string) => {
		try {
			const response = await fetch(`http://localhost:8080/chat/deleteChat?friendId=${friendId}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			if (!response.ok) {
				throw new Error('Failed to delete chats');
			}
			// Clear the messages state if the chats are successfully deleted
			setMessages([]);
			setChat('');

			console.log('Chats deleted successfully');
		} catch (error) {
			console.error('Error deleting chats:', error);
		}
	};

	const switchChat = (friendId: string) => {
		setSearchParams({ friendId }); // This will change the URL parameter
		// Additional logic to switch chat context can be added here
	};

	const getFriendNameById = (id: string) => {
		const friend = friends.find((friend) => friend.id === id);
		return friend ? friend.name : 'Unknown';
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
			{/* Friends List */}
			<div style={{ marginBottom: '20px' }}>
				{' '}
				{/* Add margin for spacing */}
				<h3>My Friends</h3>
				{friends.length > 0 ? (
					<ul style={friendsListStyle}>
						{friends.map((friend) => (
							<li key={friend.id} style={friendItemStyle} onClick={() => switchChat(friend.id)}>
								{friend.name}
							</li>
						))}
					</ul>
				) : (
					<p>No friends found.</p>
				)}
			</div>

			{/* Chat Room */}
			<div style={{ width: '100%' }}>
				{' '}
				{/* Ensure this div takes full width */}
				<h2>Chat Room</h2>
				<p>Chatting with: {friendId !== null ? getFriendNameById(friendId) : 'Unknown'}</p>
				<button onClick={() => friendId && deleteMyChats(friendId)} style={buttonStyle}>
					Clear Chat
				</button>
				<div style={{ flexGrow: 1, minHeight: '200px' }}>
					<textarea
						placeholder="Chat Verlauf"
						value={chat}
						readOnly={true}
						onChange={(event) => setChat(event.target.value)}
					></textarea>
					<ul>
						{messages.map((message) => (
							<li key={message.id}>{message.content}</li>
						))}
					</ul>
				</div>
				<div>
					<input
						type="text"
						placeholder="Send message"
						value={inputValue}
						onChange={(event) => setInputValue(event.target.value)}
					/>
					<button onClick={handleSendMessage}>Send</button>
				</div>
			</div>
		</div>
	);
};
