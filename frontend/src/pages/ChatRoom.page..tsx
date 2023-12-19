import React, { useContext, useState } from 'react';
import { SocketContext } from './context/socketContext';
import { useSearchParams } from 'react-router-dom';
import sanitizeHtml from 'sanitize-html';

type ChatMessage = {
	id: string;
	content: string;
	senderId: string;
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
	const [searchParams] = useSearchParams();
	const friendId = searchParams.get('friendId');
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const socket = useContext(SocketContext);
	const [inputValue, setInputValue] = useState('');
	const [chat, setChat] = useState('');

	// Listen for messages from the server
	socket.on('getMessage', (message) => {
		// Update the state of the ChatRoom page to display the new message
		setMessages((prevMessages) => [...prevMessages, message]);
		setChat(chat + message.content + '\n'); // Store the chat history
	});

	// Clear the input field after sending the message
	const handleSendMessage = () => {
		const sanitizedInput = sanitizeHtml(inputValue);
		if (!inputValue) {
			return; // Don't send an empty message
		}
		socket.emit('sendMessage', {
			content: sanitizedInput,
			receiverId: friendId,
		});
		setInputValue(''); // Clear the input field after sending the message
	};

	const deleteMyChats = async () => {
		try {
			const response = await fetch('/chat/myChats', {
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

	return (
		<div style={{ display: 'flex', flexDirection: 'column' }}>
			<h2>Chat Room</h2>
			<p>Chatting with friend ID: {friendId}</p>
			<button onClick={deleteMyChats} style={buttonStyle}>
				Clear All My Chats
			</button>
			<div style={{ flexGrow: 1, minHeight: 200 }}>
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
	);
};
