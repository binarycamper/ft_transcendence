import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ChatMessage = {
	id: string;
	senderName: string;
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
	const [pendingRequestCount, setPendingRequestCount] = useState(0);
	const [myRequests, setMyRequests] = useState<ChatMessage[]>([]);
	const navigate = useNavigate();

	useEffect(() => {
		fetchPendingRequests();
		fetchMyRequests(); // Fetch your own requests
	}, []);

	const fetchPendingRequests = async () => {
		setIsLoading(true);
		try {
			const response = await fetch('http://localhost:8080/chat/pendingrequests', {
				credentials: 'include',
			});
			if (!response.ok) {
				navigate('/login');
				return;
			}
			const data: ChatMessage[] = await response.json();
			setMessages(data);

			const pendingRequests = data.filter((message) => message.status === 'pending');
			setPendingRequestCount(pendingRequests.length);
		} catch (error) {
			console.error('Error fetching messages:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchMyRequests = async () => {
		setIsLoading(true);
		try {
			const response = await fetch('http://localhost:8080/chat/myrequests', {
				credentials: 'include',
			});
			if (!response.ok) {
				navigate('/login');
				return;
			}
			const data: ChatMessage[] = await response.json();
			setMyRequests(data); // Update state with your own requests
		} catch (error) {
			console.error('Error fetching my requests:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAction = async (messageId: string, action: string) => {
		try {
			const response = await fetch(`http://localhost:8080/chat/${action}/?messageid=${messageId}`, {
				method: 'POST',
				credentials: 'include',
			});
			if (!response.ok) throw new Error('Failed to update message status');
			fetchPendingRequests();
		} catch (error) {
			console.error('Error updating message:', error);
		}
	};

	const pendingRequestsStyle: React.CSSProperties = {
		backgroundColor: '#007bff', // A blue shade
		color: 'white',
		borderRadius: '50%',
		padding: '0.5em',
		marginLeft: '10px',
		fontSize: '0.8em',
		display: 'inline-block',
		minWidth: '1.5em',
		textAlign: 'center', // This should be fine now
		lineHeight: '1.5em',
	};

	const buttonStyleBase: React.CSSProperties = {
		border: 'none',
		padding: '8px 16px',
		borderRadius: '15px',
		cursor: 'pointer',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		boxShadow: '0 2px 5px rgba(0,0,0,0.2)', // subtle shadow for depth
		margin: '5px',
		transition: 'all 0.3s ease', // smooth transition for hover effects
	};

	const acceptButtonStyle: React.CSSProperties = {
		...buttonStyleBase,
		backgroundColor: '#28a745', // Bootstrap green
	};

	const declineButtonStyle: React.CSSProperties = {
		...buttonStyleBase,
		backgroundColor: '#dc3545', // Bootstrap red
	};

	return (
		<div>
			<h1>
				Open Requests:{' '}
				{pendingRequestCount > 0 && <span style={pendingRequestsStyle}>{pendingRequestCount}</span>}
			</h1>
			{isLoading ? (
				<p>Loading...</p>
			) : (
				<>
					<ul>
						{messages.map((message) => (
							<li key={message.id}>
								{message.messageType === 'friend_request' ? (
									<p>{message.senderName} sent a friend request.</p>
								) : (
									<p>{message.content}</p>
								)}
								{message.messageType === 'friend_request' && (
									<div>
										<button
											style={acceptButtonStyle}
											onClick={() => handleAction(message.id, 'accept')}
										>
											Accept
										</button>
										<button
											style={declineButtonStyle}
											onClick={() => handleAction(message.id, 'decline')}
										>
											Decline
										</button>
									</div>
								)}
							</li>
						))}
					</ul>
					<h2>My Requests:</h2>
					<ul>
						{myRequests.map((request) => (
							<li key={request.id}>
								<p>
									To: {request.receiverId} - {request.content} (Status: {request.status})
								</p>
								{/* Include buttons or actions for your own requests if needed */}
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}
