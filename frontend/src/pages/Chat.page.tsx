import React, { useState, useEffect } from 'react';

export function ChatPage() {
	const [message, setMessage] = useState('');
	const [messages, setMessages] = useState<string[]>([]);

	useEffect(() => {
		// Function to handle the event
		const handleNewMessage = (msg: string) => {
			setMessages((prevMessages) => [...prevMessages, msg]);
		};
	}, []);

	const sendMessage = () => {
		if (message.trim()) {
			// Prevent sending empty messages
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
