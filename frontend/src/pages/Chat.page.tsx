import React, { useEffect, useState } from 'react';

type ChatMessage = {
	id: string;
	senderId: string;
	receiverId: string;
	messageType: 'friend_request' | 'system_message';
	content: string;
	status: 'pending' | 'accepted' | 'declined';
	// ... any other properties that the message might have
};

export function Chat() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		fetchChatMessages();
	}, []);

	const fetchChatMessages = async () => {
		setIsLoading(true);
		try {
			const response = await fetch('http://localhost:8080/user/Chat', {
				credentials: 'include',
			});
			if (!response.ok) throw new Error('Failed to fetch messages');
			const data = await response.json();
			setMessages(data);
		} catch (error) {
			console.error('Error fetching messages:', error);
		}
		setIsLoading(false);
	};

	const handleAction = async (messageId: string, action: string) => {
		try {
			const response = await fetch(`http://localhost:8080/user/Chat/${messageId}/${action}`, {
				method: 'POST',
				credentials: 'include',
			});
			if (!response.ok) throw new Error('Failed to update message status');
			fetchChatMessages(); // Refresh messages
		} catch (error) {
			console.error('Error updating message:', error);
		}
	};

	return (
		<div>
			<h1>Chat</h1>
			{isLoading ? (
				<p>Loading...</p>
			) : (
				<ul>
					{messages.map((message) => (
						<li key={message.id}>
							<p>{message.content}</p>
							{message.messageType === 'friend_request' && (
								<div>
									<button onClick={() => handleAction(message.id, 'accept')}>Accept</button>
									<button onClick={() => handleAction(message.id, 'decline')}>Decline</button>
								</div>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
