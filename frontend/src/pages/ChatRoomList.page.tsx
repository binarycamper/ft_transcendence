import React, { useState, useEffect } from 'react';
import '../css/chatroomlist.css';

type User = {
	id: string;
	name: string;
	status: string;
};

type ChatRoom = {
	id: string;
	name: string;
	ownerName: string;
	users: User[];
	type: string;
};

export const ChatRoomList = () => {
	const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
	const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const getCurrentUser = async () => {
			try {
				const response = await fetch('http://localhost:8080/user/id', {
					credentials: 'include',
				});
				if (!response.ok) {
					throw new Error('Failed to fetch current user');
				}
				const data = await response.json();
				setCurrentUser(data);
			} catch (error: any) {
				setError('Failed to fetch current user: ' + error.message);
			}
		};

		getCurrentUser();
	}, []);

	useEffect(() => {
		if (currentUser) {
			const fetchChatRooms = async () => {
				try {
					const response = await fetch('http://localhost:8080/chat/allchatrooms', {
						credentials: 'include',
					});

					if (!response.ok) {
						throw new Error('Network response was not ok');
					}

					let data: ChatRoom[] = await response.json();

					console.log('Fetched chat rooms:', data); // Debug log

					// Filter out private rooms where the current user is not a member
					data = data.filter(
						(room) =>
							room.type !== 'private' ||
							room.users.some((user) => {
								console.log('Comparing IDs', user.id, currentUser.id); // Debug log
								return user.id === currentUser.id;
							}),
					);

					console.log('Filtered chat rooms:', data); // Debug log

					setChatRooms(data);
				} catch (error) {
					setError('Failed to load chat rooms: ' + error.message);
				} finally {
					setLoading(false);
				}
			};

			fetchChatRooms();
		}
	}, [currentUser]);

	const handleJoinRoom = async (roomId: string) => {
		// Implement the join room functionality here
		// This is an example and should be adapted to your API's requirements
		console.log(`Joining room with ID: ${roomId}`);
		// TODO: Make an API request to join the chat room
	};

	if (loading) {
		return <div>Loading chat rooms...</div>;
	}

	if (error) {
		return <div>{error}</div>;
	}

	return (
		<div>
			<div className="chat-room-list-container">
				<h1>Chat Rooms</h1>
				<ul className="chat-room-list">
					{chatRooms.map((room) => (
						<li key={room.id} className="chat-room-item">
							<span className="chat-room-name">{room.name}</span>
							<div>
								<span className="chat-room-owner">
									<span className="owner-label">Owner</span>
									{room.ownerName}
								</span>
								{/* Display users with status */}
								<div className="chat-room-users">
									<div className="members-title">Members</div>
									{room.users.map((user) => (
										<span key={user.id} className={`user-status user ${user.status}`}>
											{user.name}
										</span>
									))}
								</div>
								{!room.users.some((user) => user.id === currentUser?.id) && (
									<button onClick={() => handleJoinRoom(room.id)} className="join-room-button">
										Join
									</button>
								)}
							</div>
						</li>
					))}
				</ul>
			</div>
			<div className="status-legend">
				<div className="status-legend-item">
					<div className="status-legend-color user online"></div>
					<span>Online</span>
				</div>
				<div className="status-legend-item">
					<div className="status-legend-color user offline"></div>
					<span>Offline</span>
				</div>
				<div className="status-legend-item">
					<div className="status-legend-color user away"></div>
					<span>Away</span>
				</div>
				<div className="status-legend-item">
					<div className="status-legend-color user ingame"></div>
					<span>In Game</span>
				</div>
				<div className="status-legend-item">
					<div className="status-legend-color user unknown"></div>
					<span>Unknown</span>
				</div>
			</div>
		</div>
	);
};
