import React, { useState, useEffect } from 'react';
import '../css/chatroomlist.css';
import { HttpStatusCode } from 'axios';

type User = {
	id: string;
	name: string;
	status: string;
};

type ChatRoom = {
	id: string;
	name: string;
	ownerName: string;
	ownerId: string;
	users: User[];
	type: string;
	adminIds: string[];
};

export const ChatRoomList = () => {
	const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
	const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [joinError, setJoinError] = useState('');

	useEffect(() => {
		const getCurrentUser = async () => {
			try {
				const response = await fetch('http://localhost:8080/user/id', {
					credentials: 'include',
				});
				if (!response.ok) {
					setError('Failed to fetch current user');
					return;
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
						setError('Failed to load chat rooms: ');
						return;
					}

					let data: ChatRoom[] = await response.json();

					//console.log('Fetched chat rooms:', data); // Debug log

					// Filter out private rooms where the current user is not a member
					data = data.filter(
						(room) =>
							room.type !== 'private' ||
							room.users.some((user) => {
								//console.log('Comparing IDs', user.id, currentUser.id); // Debug log
								return user.id === currentUser.id;
							}),
					);

					//console.log('Filtered chat rooms:', data); // Debug log

					setChatRooms(data);
				} catch (error) {
					setError('Failed to load chat rooms: ' + error);
				} finally {
					setLoading(false);
				}
			};

			fetchChatRooms();
		}
	}, [currentUser]);

	const handleJoinRoom = async (roomId: string, roomType: string) => {
		try {
			let password = '';
			if (roomType === 'public') {
				password = prompt('Enter the password for this room:') || '';
			}
			const placeholder = 'OOO'; //usernameToInvite = jwt infos , dont need to request
			const response = await fetch(`http://localhost:8080/chat/joinroom`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ roomId, userNameToInvite: placeholder, password }),
			});

			if (response.ok) {
				//console.log(`Joined room with ID: ${roomId}`);
				window.location.href = 'http://localhost:5173/chatroom';
			} else {
				const errorData = await response.json();
				setJoinError('Failed to join room: ' + errorData.message);
			}
		} catch (error) {
			setJoinError('An error occurred while attempting to join the room.');
		}
	};

	const handleKickUser = async (roomId: string, userId: string, ownerId: string) => {
		try {
			if (userId === currentUser?.id && userId === ownerId) {
				const isConfirmed = window.confirm('Are you sure you want to delete this chat room?');
				if (!isConfirmed) return;

				const deleteResponse = await fetch(
					`http://localhost:8080/chat/deletechatroom?chatroomId=${roomId}`,
					{
						method: 'DELETE',
						credentials: 'include',
						headers: {
							'Content-Type': 'application/json',
						},
					},
				);

				if (deleteResponse.status === HttpStatusCode.NoContent) {
					setChatRooms((prevRooms) => prevRooms.filter((room) => room.id !== roomId));
				} else {
					const errorData = await deleteResponse.json();
					setJoinError(errorData.message || 'Failed to delete chat room');
				}
				return;
			}

			const response = await fetch(`http://localhost:8080/chat/kickuser`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ roomId, userId }),
			});

			if (response.ok) {
				//console.log(`User with ID: ${userId} kicked from room: ${roomId}`);
				setChatRooms((prevRooms) =>
					prevRooms.map((room) => {
						if (room.id === roomId) {
							return { ...room, users: room.users.filter((user) => user.id !== userId) };
						}
						return room;
					}),
				);
			} else {
				const errorData = await response.json();
				const errorMessage = errorData.message || 'Failed to kick user';
				setJoinError(errorMessage);
			}
		} catch (error) {
			setJoinError('Error while attempting to kick user: ' + error);
		}
	};

	const handleMakeAdmin = async (roomId: string, userId: string) => {
		try {
			const response = await fetch(`http://localhost:8080/chat/upgradeToAdmin`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ roomId, userId }),
			});

			if (response.ok) {
				window.location.href = 'http://localhost:5173/chatroomlist';
			} else {
				const errorData = await response.json();
				setJoinError('Failed to make user admin: ' + errorData.message);
			}
		} catch (error) {
			setJoinError('Error while attempting to make user admin: ' + error);
		}
	};

	const handleRevokeAdmin = async (roomId: string, userId: string) => {
		if (!window.confirm("Are you sure you want to revoke this user's admin status?")) {
			return;
		}

		try {
			const response = await fetch(`http://localhost:8080/chat/revokeadmin`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ roomId, userId }),
			});

			if (response.ok) {
				// Update the chatRooms state to reflect the change
				setChatRooms((prevRooms) =>
					prevRooms.map((room) => {
						if (room.id === roomId) {
							// Remove the userId from the adminIds array
							return {
								...room,
								adminIds: room.adminIds.filter((adminId) => adminId !== userId),
							};
						}
						return room;
					}),
				);
			} else {
				const errorData = await response.json();
				setJoinError('Failed to revoke admin status: ' + errorData.message);
			}
		} catch (error) {
			setJoinError('Error while attempting to revoke admin status: ' + error);
		}
	};

	const handleChangePassword = async (roomId: string) => {
		const oldPassword = prompt('Enter the current password for the chat room:');
		if (oldPassword === null) {
			return; // User cancelled the prompt
		}

		const newPassword = prompt(
			'Enter new password for the chat room (leave blank for no password):',
		);
		// Note: If the user enters nothing and confirms, newPassword will be an empty string

		try {
			const response = await fetch(`http://localhost:8080/chat/changepassword`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ roomId, oldPassword, newPassword }),
			});

			if (response.ok) {
				if (newPassword === '') {
					alert('Password removed successfully');
				} else {
					alert('Password updated successfully');
				}
				// Additional logic on success
			} else {
				const errorData = await response.json();
				alert('Failed to update password: ' + errorData.message);
			}
		} catch (error) {
			alert('Error while attempting to update password: ' + error);
		}
	};

	if (loading) {
		return <div>Loading chat rooms...</div>;
	}

	if (error) {
		return <div>{error}</div>;
	}

	return (
		<div>
			{joinError && <div className="join-error">{joinError}</div>}
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
								{room.ownerId === currentUser?.id && (
									<button
										className="change-password-button"
										onClick={() => handleChangePassword(room.id)}
									>
										<span className="icon">🔒</span>
										Change Password
									</button>
								)}
								{/* Display admins */}
								<div className="chat-room-admins">
									<div className="admins-title">Admins</div>
									{room.users
										.filter((user) => room.adminIds.includes(user.id))
										.map((admin) => (
											<span key={admin.id} className={`user-status user ${admin.status}`}>
												{admin.name}
												{room.ownerId === currentUser?.id && admin.id !== currentUser?.id && (
													<>
														<button
															className="kick-user-button"
															onClick={() => handleKickUser(room.id, admin.id, room.ownerId)}
														>
															x
														</button>
														<button
															className="revoke-admin-button"
															onClick={() => handleRevokeAdmin(room.id, admin.id)} // Add the onClick event for handleRevokeAdmin here
														>
															Revoke Admin
														</button>
													</>
												)}
												{admin.id === currentUser?.id && (
													<button
														className="kick-user-button"
														onClick={() => handleKickUser(room.id, admin.id, room.ownerId)}
													>
														x
													</button>
												)}
											</span>
										))}
								</div>

								{/* Display regular members */}
								<div className="chat-room-users">
									<div className="members-title">Members</div>
									{room.users
										.filter((user) => !room.adminIds.includes(user.id))
										.map((user) => (
											<span key={user.id} className={`user-status user ${user.status}`}>
												{user.name}
												{(room.ownerId === currentUser?.id ||
													(room.adminIds.includes(currentUser?.id) &&
														user.id !== currentUser?.id)) && ( // Owner and admins can kick non-admins, but not themselves
													<button
														className="kick-user-button"
														onClick={() => handleKickUser(room.id, user.id, room.ownerId)}
													>
														x
													</button>
												)}
												{user.id === currentUser?.id && ( // Users can kick themselves
													<button
														className="kick-user-button"
														onClick={() => handleKickUser(room.id, user.id, room.ownerId)}
													>
														x
													</button>
												)}
												{room.ownerId === currentUser?.id &&
													!room.adminIds.includes(user.id) && ( // Only owner can set admins
														<button
															className="make-admin-button"
															onClick={() => handleMakeAdmin(room.id, user.id)}
														>
															Set Admin
														</button>
													)}
											</span>
										))}
								</div>
								{!room.users.some((user) => user.id === currentUser?.id) && (
									<button
										onClick={() => handleJoinRoom(room.id, room.type)}
										className="join-room-button"
									>
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
