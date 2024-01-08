import React, { useState, useEffect } from 'react';
import '../css/chatroomlist.css';
import { HttpStatusCode } from 'axios';

type User = {
	id: string;
	name: string;
	status: string;
};

type Mute = {
	userId: string;
	endTime: string;
};

type ChatRoom = {
	id: string;
	name: string;
	ownerName: string;
	ownerId: string;
	users: User[];
	type: string;
	adminIds: string[];
	mutes: Mute[];
};

export function ChatRoomList() {
	const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
	const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [joinError, setJoinError] = useState('');
	const [muteDurations, setMuteDurations] = useState<{ [key: string]: number }>({});
	const [mutedUsers, setMutedUsers] = useState<{ [userId: string]: boolean }>({});

	useEffect(() => {
		async function getCurrentUser() {
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
		}
		getCurrentUser();
	}, []);

	useEffect(() => {
		if (currentUser) {
			async function fetchChatRooms() {
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

					const newMutedUsers: Record<string, boolean> = {};
					const currentTime = new Date();

					data.forEach((room) => {
						room.mutes.forEach((mute) => {
							console.log('Mute:', mute); // Check each mute structure
							if (new Date(mute.endTime) > currentTime) {
								console.log('Muting user:', mute.userId); // Verify correct userId
								newMutedUsers[mute.userId] = true;
							}
						});
					});

					setMutedUsers(newMutedUsers);
					setChatRooms(data);
				} catch (error) {
					setError('Failed to load chat rooms: ' + error);
				} finally {
					setLoading(false);
				}
			}

			fetchChatRooms();
		}
	}, [currentUser]);

	async function handleJoinRoom(roomId: string, roomType: 'private' | 'public') {
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
	}

	async function handleKickUser(roomId: string, userId: string, ownerId: string) {
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
	}

	async function handleMakeAdmin(roomId: string, userId: string) {
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
	}

	async function handleRevokeAdmin(roomId: string, userId: string) {
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
	}

	async function handleChangePassword(roomId: string) {
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
	}

	function handleMuteDurationChange(userId: string, value: string) {
		// Assert that e.target.value is a key of MuteDurationOptions
		const duration = MuteDurationOptions[value as keyof typeof MuteDurationOptions];
		setMuteDurations((prevDurations) => ({ ...prevDurations, [userId]: duration }));
	}

	const MuteDurationOptions = {
		'5min': 5 * 60 * 1000, // 5 minutes in milliseconds
		'2min': 2 * 60 * 1000, // 2 minutes
		'1h': 60 * 60 * 1000, // 1 hour
		'3h': 3 * 60 * 60 * 1000, // 3 hours
		'1d': 24 * 60 * 60 * 1000, // 1 day
	};

	async function handleMuteUser(roomId: string, userIdToMute: string, muteDuration: number) {
		// Only allow the owner or an admin to mute users
		const room = chatRooms.find((room) => room.id === roomId);
		if (
			!room ||
			!currentUser ||
			(room.ownerId !== currentUser?.id && !room.adminIds.includes(currentUser?.id))
		) {
			alert('You do not have permission to mute users in this room.');
			return;
		}
		console.log('muteDuration: ', muteDuration);
		try {
			const response = await fetch(`http://localhost:8080/chat/mute`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ muteDuration, roomId, userIdToMute }),
			});

			if (response.ok) {
				// Handle the response. For example, update the UI or notify the user.
				alert('User has been muted successfully');
				window.location.href = 'http://localhost:5173/chatroomlist';
			} else {
				const errorData = await response.json();
				alert('Failed to mute user: ' + errorData.message);
			}
		} catch (error) {
			alert('Error while attempting to mute user: ' + error);
		}
	}

	async function handleUnmuteUser(roomId: string, userIdToUnMute: string) {
		try {
			console.log('USERID: ', userIdToUnMute);
			console.log('roomId: ', roomId);

			const response = await fetch(`http://localhost:8080/chat/unmute`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ roomId, userIdToUnMute }),
			});

			if (response.ok) {
				// Unmute was successful, update the state
				setMutedUsers((prev) => ({ ...prev, [userIdToUnMute]: false }));
				alert('User has been unmuted successfully');
			} else {
				// There was an error with the unmute operation
				const errorData = await response.json();
				alert('Failed to unmute user: ' + errorData.message);
			}
		} catch (error) {
			// Handle network error or other unexpected errors
			alert('Error while attempting to unmute user: ' + error);
		}
	}

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
												{/* Owner controls for kicking and revoking admin privileges */}
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
															onClick={() => handleRevokeAdmin(room.id, admin.id)}
														>
															Revoke Admin
														</button>
													</>
												)}
												{/* Mute or Unmute button based on the admin's current mute status */}
												{room.ownerId === currentUser?.id && admin.id !== currentUser?.id && (
													<>
														{mutedUsers[admin.id] ? (
															<button
																className="unmute-button"
																onClick={() => handleUnmuteUser(room.id, admin.id)}
															>
																Unmute
															</button>
														) : (
															<>
																<select
																	onChange={(e) =>
																		handleMuteDurationChange(admin.id, e.target.value)
																	}
																	value={muteDurations[admin.id] || ''}
																>
																	<option value="">Select Mute Duration</option>
																	{Object.entries(MuteDurationOptions).map(([key]) => (
																		<option key={key} value={key}>
																			{key}
																		</option>
																	))}
																</select>
																<button
																	className="mute-button"
																	onClick={() =>
																		handleMuteUser(room.id, admin.id, muteDurations[admin.id] || 0)
																	}
																>
																	Mute
																</button>
															</>
														)}
													</>
												)}
												{/* Allow admins to leave the chatroom */}
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
												{/* Kick button for owners and admins */}
												{(room.ownerId === currentUser?.id ||
													(currentUser &&
														room.adminIds.includes(currentUser?.id) &&
														user.id !== currentUser?.id)) && (
													<button
														className="kick-user-button"
														onClick={() => handleKickUser(room.id, user.id, room.ownerId)}
													>
														x
													</button>
												)}
												{/* Mute or Unmute button based on the user's current mute status */}
												{((currentUser && room.ownerId === currentUser?.id) ||
													(currentUser && room.adminIds.includes(currentUser?.id))) && (
													<>
														{mutedUsers[user.id] ? (
															<button
																className="unmute-button"
																onClick={() => handleUnmuteUser(room.id, user.id)}
															>
																Unmute
															</button>
														) : (
															<>
																<select
																	onChange={(e) =>
																		handleMuteDurationChange(user.id, e.target.value)
																	}
																	value={muteDurations[user.id] || ''}
																>
																	<option value="">Select Mute Duration</option>
																	{Object.entries(MuteDurationOptions).map(([key]) => (
																		<option key={key} value={key}>
																			{key}
																		</option>
																	))}
																</select>
																<button
																	className="mute-button"
																	onClick={() =>
																		handleMuteUser(room.id, user.id, muteDurations[user.id] || 0)
																	}
																>
																	Mute
																</button>
															</>
														)}
													</>
												)}
												{/* Allow users to leave the chatroom */}
												{user.id === currentUser?.id && (
													<button
														className="kick-user-button"
														onClick={() => handleKickUser(room.id, user.id, room.ownerId)}
													>
														x
													</button>
												)}
												{/* Button to make a member an admin if the current user is the owner */}
												{room.ownerId === currentUser?.id && !room.adminIds.includes(user.id) && (
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
}
