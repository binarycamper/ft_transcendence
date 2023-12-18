import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type ChatMessage = {
	id: string;
	content: string;
	senderId: string;
	// Add other necessary fields
};

export const ChatRoom = () => {
	const [searchParams] = useSearchParams();
	const friendId = searchParams.get('friendId');
	const [messages, setMessages] = useState<ChatMessage[]>([]);

	// Example function to fetch chat messages
	const fetchMessages = async () => {
		// Fetch messages from your API or server
		// This is just a placeholder logic
		const fetchedMessages = [
			{ id: '1', content: 'Hello!', senderId: friendId || 'unknown' },
			// ... more messages
		];
		setMessages(fetchedMessages);
	};

	useEffect(() => {
		if (friendId) {
			fetchMessages();
		}
	}, [friendId]);

	return (
		<div>
			<h2>Chat Room</h2>
			{friendId ? <p>Chatting with friend ID: {friendId}</p> : <p>Select a friend to chat with</p>}
			<div>
				{messages.map((message) => (
					<div key={message.id}>
						<p>{message.content}</p>
						{/* Add more message details if needed */}
					</div>
				))}
			</div>
			{/* Add input fields and buttons for sending messages */}
		</div>
	);
};
