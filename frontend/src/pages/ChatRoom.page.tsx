import React, { useContext, useEffect, useState } from 'react';
import { SocketContext } from './context/socketContext';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@mantine/core';
import { HttpStatusCode } from 'axios';

type Friend = {
	id: string;
	name: string;
	nickname: string;
	status: string;
};
interface ChatRoom {
	id: string;
	name: string;
	type: string;
	// Add other properties from ChatRoom entity if needed
}

type ChatMessage = {
	id: string;
	content: string;
	senderId: string;
	receiverId: string;
	// Add any other relevant properties
};

const buttonStyle = {
	marginLeft: '10px',
	padding: '5px 10px',
	backgroundColor: '#4CAF50',
	color: 'white',
	border: 'none',
	borderRadius: '4px',
	cursor: 'pointer',
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

	const [chatRoomName, setChatRoomName] = useState('');
	const [chatRoomType, setChatRoomType] = useState('public');
	const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
	const [selectedChatRoom, setselectedChatRoom] = useState<ChatRoom | null>(null);
	const [chatRoomError, setChatRoomError] = useState('');
	const [inviteUsername, setInviteUsername] = useState('');

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
				//console.log('Not authenticated?: ', error);
				navigate('/');
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
				console.log('fetching friends not possible: ', error);
				navigate('/');
			}
		};

		fetchFriends();
	}, []);

	const handleSelectFriend = (friend: Friend) => {
		if (selectedChatRoom) {
			setselectedChatRoom(null); // Unselect the chat room if any is selected
		}
		setSelectedFriend(friend); // Select the friend
		setChatMessages([]); // Clear previous chat history
		fetchChatHistory(friend.id); // Fetch the chat history for the selected friend
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
			// First, handle the case where the message is for a chat with a friend
			if (
				(selectedFriend && //Here we check if selectedFriend is not null...
					message.senderId === currentUserId &&
					message.receiverId === selectedFriend.id) ||
				(message.receiverId === currentUserId && message.senderId === selectedFriend.id)
			) {
				setChatMessages((prevMessages) => [...prevMessages, message]);
			}
			// Then, if there is a selected chatroom, check if the message belongs to it
			else if (
				selectedChatRoom && // Check if selectedChatRoom is not null
				message.receiverId === selectedChatRoom.id
			) {
				setChatMessages((prevMessages) => [...prevMessages, message]);
			}
		};

		socket.on('receiveMessage', handleNewMessage);
		// If you have a separate event for chat room messages, set up a listener for that as well
		// socket.on('receiveChatRoomMessage', handleNewMessage);

		return () => {
			socket.off('receiveMessage', handleNewMessage);
			// socket.off('receiveChatRoomMessage', handleNewMessage);
		};
	}, [socket, currentUserId, selectedFriend, selectedChatRoom]); // Add dependencies here as needed

	const handleSendMessage = () => {
		if (!newMessage.trim()) return; // Avoid sending empty messages

		if (selectedFriend) {
			const messageToSend = {
				content: newMessage,
				receiverId: selectedFriend.id, // assuming you have an endpoint that handles sending to a friend
				// ...other required fields
			};

			// Send the message to the friend
			socket.emit('sendMessage', messageToSend);
		} else if (selectedChatRoom) {
			const messageToSend = {
				content: newMessage,
				chatRoomId: selectedChatRoom.id, // assuming you have an endpoint that handles sending to a chat room
				// ...other required fields
			};
			// Send the message to the chat room
			socket.emit('sendMessageToChatRoom', messageToSend);
		}
		setNewMessage('');
	};

	// Function to get the display name for each message
	const getDisplayName = (senderId: string) => {
		if (senderId === currentUserId) return currentUserName;
		if (senderId === selectedFriend?.id) return selectedFriend.nickname || selectedFriend.name;
		return 'Unknown'; // Fallback for any mismatch
	};

	const handleClearChat = async (id: string, isRoom: boolean) => {
		let url = isRoom
			? `http://localhost:8080/chat/clearchatroom?chatroomId=${id}`
			: `http://localhost:8080/chat/deletechat?friendId=${id}`;
		//console.log('url: ', url);
		const confirmation = window.confirm(
			'Clearing this chat will delete all messages. Do you want to proceed?',
		);

		if (confirmation) {
			try {
				await fetch(url, {
					method: 'DELETE',
					credentials: 'include',
				});
				if (selectedChatRoom?.id === id) {
					// Clear chat messages from the state if the selected chat room's chat is being cleared
					setChatMessages([]);
				} else if (selectedFriend?.id === id) {
					// Clear chat messages from the state if the selected friend's chat is being cleared
					setChatMessages([]);
				}
			} catch (error) {
				console.error('Error clearing chat:', error);
			}
		}
	};

	//const handleClearChat = async (friendId: string) => {
	//	const confirmation = window.confirm(
	//		'Clearing this chat will also clear it for your friend. Do you want to proceed?',
	//	);
	//
	//	if (confirmation) {
	//		try {
	//			await fetch(`http://localhost:8080/chat/deleteChat?friendId=${friendId}`, {
	//				method: 'DELETE',
	//				credentials: 'include',
	//			});
	//			// Clear chat messages from the state if the selected friend's chat is being cleared
	//			if (selectedFriend?.id === friendId) {
	//				setChatMessages([]);
	//			}
	//		} catch (error) {
	//			console.error('Error clearing chat:', error);
	//		}
	//	}
	//};

	const navigateToFriendProfile = (friendName: string) => {
		navigate(`/publicprofile`, { state: { friendName: friendName } });
	};

	const inviteToPongGame = async (friendId: string) => {
		try {
			const response = await fetch(`http://localhost:8080/chat/invite?friendId=${friendId}`, {
				method: 'POST',
				credentials: 'include',
			});

			const data = await response.json();
			if (response.ok) {
				console.log('Invitation sent:', data.message);
				// Implement any additional logic on successful invitation
			} else {
				console.error('Failed to send invitation:', data.message);
				// Implement error handling logic
			}
		} catch (error) {
			console.error('Error while sending invitation:', error);
			// Implement error handling logic
		}
	};

	// Function to handle the creation of a new chat room
	const handleCreateChatRoom = async () => {
		if (!chatRoomName) {
			alert('Please enter a name for the chat room.');
			return;
		}

		// Prompt for a password, indicating it's optional for public rooms
		const passwordPrompt =
			chatRoomType === 'private'
				? 'Enter a password for the private chat room:'
				: 'Enter a password for the public chat room (optional):';

		const password = window.prompt(passwordPrompt) || '';

		// Construct chat room data here based on the state
		const chatRoomData = {
			name: chatRoomName,
			ownerId: currentUserId,
			type: chatRoomType,
			password: password.trim(), // Trim to ensure no whitespace-only passwords
			messages: [],
			users: [],
		};

		try {
			// Call your API to create the chat room
			const response = await fetch('http://localhost:8080/chat/chatroom', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(chatRoomData),
			});

			if (response.status === HttpStatusCode.Forbidden) {
				setChatRoomError('You have reached the maximum number of chat rooms.');
			} else if (response.status === HttpStatusCode.BadRequest) {
				setChatRoomError('Chat room name already in use.');
			} else if (response.ok) {
				const result = await response.json();
				window.location.reload();
				//console.log('Chat room created:', result);
				setChatRoomError('');
				// Reset form fields
				setChatRoomName('');
				setChatRoomType('public');
			} else {
				setChatRoomError('ChatRoom creation failed');
				//throw new Error('Failed to create chat room');
			}
		} catch (error) {
			setChatRoomError('ChatRoom creation failed');
			//console.error('Error creating chat room:', error);
		}
	};

	// Fetch chat rooms when component mounts
	useEffect(() => {
		const fetchChatRooms = async () => {
			try {
				const response = await fetch('http://localhost:8080/chat/mychatrooms', {
					credentials: 'include',
				});
				if (!response.ok) {
					throw new Error('Failed to fetch chat rooms');
				}
				const rooms = await response.json();
				setChatRooms(rooms);
			} catch (error) {
				console.error('Error fetching chat rooms:', error);
			}
		};

		fetchChatRooms();
	}, []);

	const fetchChatRoomHistory = async (chatRoomId: string) => {
		try {
			const response = await fetch(
				`http://localhost:8080/chat/chatroomhistory/?chatroomid=${chatRoomId}`,
				{
					method: 'GET',
					credentials: 'include',
				},
			);
			if (!response.ok) {
				throw new Error('Failed to fetch chatroom history');
			}
			const history = await response.json();
			console.log('res: ', history);
			setChatMessages(history);
		} catch (error) {
			console.error('Error fetching chatroom history:', error);
		}
	};

	const handleChatRoomSelect = (chatRoom: ChatRoom) => {
		if (selectedFriend) {
			setSelectedFriend(null); // Unselect the friend if any is selected
		}
		setselectedChatRoom(chatRoom); // Select the chat room
		setChatMessages([]); // Clear previous chat history
		fetchChatRoomHistory(chatRoom.id); // Fetch the chat history for the selected chat room
	};

	const handleDeleteChatRoom = async (chatRoomId: string) => {
		const confirmation = window.confirm(
			'Are you sure you want to delete this chat room? This cannot be undone.',
		);
		if (!confirmation) return;

		try {
			const response = await fetch(
				`http://localhost:8080/chat/deletechatroom?chatroomId=${chatRoomId}`,
				{
					method: 'DELETE',
					credentials: 'include',
				},
			);

			if (response.ok) {
				// Remove the deleted chat room from state
				setChatRooms((prevRooms) => prevRooms.filter((room) => room.id !== chatRoomId));
			} else {
				console.error('Failed to delete chat room');
			}
		} catch (error) {
			setChatRoomError('' + error);
			//console.error(error);
		}
	};

	const handleInviteSubmit = async (event, roomId: string) => {
		event.preventDefault();
		if (!inviteUsername.trim()) {
			alert('Please enter a username.');
			return;
		}
		// Call your invite function here using roomId and inviteUsername
		try {
			const response = await fetch(`http://localhost:8080/chat/inviteToRoom`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					roomId,
					userNameToInvite: inviteUsername,
				}),
			});

			const data = await response.json();
			if (response.ok) {
				alert(`User ${inviteUsername} invited to the room successfully.`);
				setInviteUsername(''); // Clear the input after successful invite
			} else {
				alert(`Failed to invite user: ${data.message}`);
			}
		} catch (error) {
			alert('Failed to invite user. Please try again.');
			console.error('Error inviting to room:', error);
		}
	};

	// Implement ChatRoom creation MaxLimit, like every uSer can create 5 grp channels.
	return (
		<div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
			<div style={{ marginBottom: '30px', textAlign: 'center' }}>
				Current User: <strong>{currentUserName || 'Loading...'}</strong>
			</div>

			<div style={{ marginBottom: '20px' }}>
				<input
					type="text"
					placeholder="Chat Room Name"
					value={chatRoomName}
					onChange={(e) => setChatRoomName(e.target.value)}
					style={{ padding: '10px', marginRight: '10px', width: 'calc(100% - 22px)' }}
				/>
				<label style={{ marginRight: '10px' }}>
					<input
						type="radio"
						name="chatRoomType"
						value="public"
						checked={chatRoomType === 'public'}
						onChange={(e) => setChatRoomType(e.target.value)}
					/>
					Public
				</label>
				<label>
					<input
						type="radio"
						name="chatRoomType"
						value="private"
						checked={chatRoomType === 'private'}
						onChange={(e) => setChatRoomType(e.target.value)}
					/>
					Private
				</label>
				<button
					onClick={handleCreateChatRoom}
					disabled={!chatRoomName}
					style={{
						padding: '10px 20px',
						backgroundColor: chatRoomName ? '#4CAF50' : '#9E9E9E',
						color: 'white',
						border: 'none',
						cursor: chatRoomName ? 'pointer' : 'default',
					}}
				>
					Create Chat Room
				</button>
				{chatRoomError && <div style={{ color: 'red', marginTop: '10px' }}>{chatRoomError}</div>}
			</div>
			{/* Render Chat Rooms */}
			<div style={{ marginTop: '20px' }}>
				<h2>My ChatRooms</h2>
				<ul style={{ listStyle: 'none', paddingLeft: 0 }}>
					{chatRooms.map((room: ChatRoom) => (
						<li
							key={room.id}
							onClick={() => handleChatRoomSelect(room)}
							style={{
								cursor: 'pointer',
								backgroundColor: selectedChatRoom?.id === room.id ? '#AED581' : 'transparent',
								color: selectedChatRoom?.id === room.id ? '#263238' : '#FFF',
								padding: '10px',
								border: '1px solid #ccc',
								borderRadius: '4px',
								marginBottom: '10px',
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
							}}
						>
							<span style={{ flexGrow: 1 }}>{'(' + room.type + ') ' + room.name}</span>
							<span>
								<button onClick={() => handleClearChat(room.id, true)} style={buttonStyle}>
									Clear Chat
								</button>
								<button onClick={() => handleRoomSettings(room.id)} style={buttonStyle}>
									Settings
								</button>
								<button onClick={() => handleInviteToRoom(room.id)} style={buttonStyle}>
									add user to {room.name}
									<form onSubmit={(e) => handleInviteSubmit(e, room.id)}>
										<input
											type="text"
											placeholder="Enter username to invite"
											value={inviteUsername}
											onChange={(e) => setInviteUsername(e.target.value)}
										/>
										<button type="submit">Invite</button>
									</form>
								</button>
								<button onClick={() => handleDeleteChatRoom(room.id)} style={buttonStyle}>
									Delete
								</button>
							</span>
						</li>
					))}
				</ul>
			</div>
			<h2 style={{ marginTop: '40px', textAlign: 'center' }}>My Friends</h2>
			<ul style={{ listStyle: 'none', paddingLeft: 0 }}>
				{friends.map((friend: Friend) => (
					<li
						key={friend.id}
						onClick={() => handleSelectFriend(friend)}
						style={{
							cursor: 'pointer',
							backgroundColor: selectedFriend?.id === friend.id ? '#AED581' : 'transparent', // Light green background for better contrast
							color: selectedFriend?.id === friend.id ? '#263238' : '#FFF', // Dark text color for the selected item
							padding: '10px',
							border: '1px solid #ccc',
							borderRadius: '4px',
							marginBottom: '10px',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
						}}
					>
						<span style={{ flexGrow: 1 }} onClick={() => handleSelectFriend(friend)}>
							{friend.nickname || friend.name}
						</span>
						<span>
							<button onClick={() => handleClearChat(friend.id, false)} style={buttonStyle}>
								Clear Chat
							</button>
							<button onClick={() => navigateToFriendProfile(friend.name)} style={buttonStyle}>
								Profile
							</button>
							<button onClick={() => inviteToPongGame(friend.id)} style={buttonStyle}></button>
						</span>
					</li>
				))}
			</ul>

			{selectedFriend || selectedChatRoom ? (
				<>
					<h2 style={{ marginTop: '30px', textAlign: 'center' }}>
						Chat with {selectedFriend ? selectedFriend.name : selectedChatRoom.name}
						{selectedFriend && selectedFriend.nickname && ` | ${selectedFriend.nickname}`}
						{selectedFriend && selectedFriend.status && ` - Status: ${selectedFriend.status}`}
					</h2>
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
									padding: '10px',
									borderRadius: '4px',
									margin: '5px 0',
									color: '#fff',
									alignSelf: message.senderId === currentUserId ? 'flex-end' : 'flex-start',
								}}
							>
								<p>
									<strong>{getDisplayName(message.senderId)}</strong>: {message.content}
								</p>
							</div>
						))}
					</div>
					<div style={{ display: 'flex', marginTop: '10px' }}>
						<input
							type="text"
							value={newMessage}
							onChange={(e) => setNewMessage(e.target.value)}
							placeholder="Type a message..."
							style={{ flexGrow: 1, padding: '10px', marginRight: '10px' }}
						/>
						<button
							onClick={handleSendMessage}
							style={{
								padding: '10px 20px',
								backgroundColor: '#4CAF50',
								color: 'white',
								border: 'none',
								borderRadius: '4px',
								cursor: 'pointer',
							}}
						>
							Send
						</button>
					</div>
				</>
			) : null}
		</div>
	);
};
