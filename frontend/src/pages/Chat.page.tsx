import React, { useState } from 'react';

// Define the type for individual message, change it according to your needs
type Message = string;

export function Chat() {
	// Explicitly declare the type of messages as an array of Message
	const [messages, setMessages] = useState<Message[]>([]);

	// Declare the messageInput as a string
	const [messageInput, setMessageInput] = useState<string>('');

	const handleSendClick = () => {
		if (messageInput.trim()) {
			setMessages([...messages, messageInput]);
			setMessageInput('');
		}
	};

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setMessageInput(event.target.value);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			handleSendClick();
		}
	};

	return (
		<div>
			<h2>Chat</h2>
			<div
				id="message-area"
				style={{
					height: '300px',
					overflowY: 'scroll',
					border: '1px solid black',
					marginBottom: '10px',
				}}
			>
				{messages.map((message, index) => (
					<div key={index}>{message}</div>
				))}
			</div>
			<input
				type="text"
				value={messageInput}
				onChange={handleInputChange}
				onKeyDown={handleKeyDown}
				style={{ marginRight: '5px' }}
			/>
			<button onClick={handleSendClick}>Send</button>
		</div>
	);
}
