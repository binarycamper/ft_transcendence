import React, { useContext, useState } from 'react';
import { SocketContext } from './context/socketContext';
import { useSearchParams } from 'react-router-dom';

type ChatMessage = {
	id: string;
	content: string;
	senderId: string;
};

export const ChatRoom = () => {
	const [searchParams] = useSearchParams();
	const friendId = searchParams.get('friendId');
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const socket = useContext(SocketContext);
	const [inputValue, setInputValue] = useState('');
	const [chat, setChat] = useState('');

	// Listen for messages from the server
	socket.on('message', (message) => {
		// Update the state of the ChatRoom page to display the new message
		setMessages((prevMessages) => [...prevMessages, message]);
		setChat(chat + message.content + '\n'); // Store the chat history
	});

	// Clear the input field after sending the message
	const handleSendMessage = () => {
		socket.emit('message', {
			content: inputValue,
			senderId: friendId,
		});
		setInputValue(''); // Clear the input field after sending the message
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column' }}>
			<h2>Chat Room</h2>
			<p>Chatting with friend ID: {friendId}</p>
			<div style={{ flexGrow: 1, minHeight: 200 }}>
				<textarea
					placeholder="Chat Verlauf"
					value={chat}
					onChange={(event) => setChat(event.target.value)}
				></textarea>
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
