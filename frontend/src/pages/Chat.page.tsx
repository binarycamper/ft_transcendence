import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:8080'); // Your server URL

export function ChatPage() {
	const [message, setMessage] = useState('');
	const [messages, setMessages] = useState<string[]>([]);

	useEffect(() => {
		// Function to handle the event
		const handleNewMessage = (msg: string) => {
			setMessages((prevMessages) => [...prevMessages, msg]);
		};

		// Set up the event listener
		socket.on('receiveMessage', handleNewMessage);

		// Clean up the event listener
		return () => {
			socket.off('receiveMessage', handleNewMessage);
		};
	}, []);

	const sendMessage = () => {
		if (message.trim()) {
			// Prevent sending empty messages
			socket.emit('sendMessage', message);
			setMessage('');
		}
	};

	return (
		<div>
			<div className="messages">
				{messages.map((msg, index) => (
					<p key={index}>{msg}</p>
				))}
			</div>
			<textarea
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault(); // Prevent newline on Enter
						sendMessage();
					}
				}}
			/>
			<button onClick={sendMessage}>Send</button>
		</div>
	);
}
