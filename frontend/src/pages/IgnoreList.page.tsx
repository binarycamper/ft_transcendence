import React, { useEffect, useState } from 'react';

interface BlockedUser {
	id: string;
	name: string;
}

const IgnoreList = () => {
	const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [userNameToBlock, setUserNameToBlock] = useState('');

	const fetchBlockedUsers = async () => {
		setIsLoading(true);
		try {
			const response = await fetch('http://localhost:8080/user/blockedUsers', {
				credentials: 'include',
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch blocked users: ${response.status}`);
			}
			const data = await response.json();
			setBlockedUsers(data);
		} catch (error) {
			console.error('Error fetching blocked users:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// Call fetchBlockedUsers on component mount
	useEffect(() => {
		fetchBlockedUsers();
	}, []);

	const unblockUser = async (userId: string) => {
		try {
			const response = await fetch(`http://localhost:8080/user/unblockUser?userid=${userId}`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			if (!response.ok) {
				throw new Error(`Failed to unblock user: ${response.status}`);
			}
			const data = await response.json();
			console.log(data.message);
			// Filter out the unblocked user from the blockedUsers state
			setBlockedUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
		} catch (error) {
			console.error('Error unblocking user:', error);
		}
	};

	const blockUser = async () => {
		try {
			const response = await fetch(
				`http://localhost:8080/user/blockUser/?userName=${userNameToBlock}`,
				{
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);
			const data = await response.json();

			if (response.ok) {
				console.log(data.message);
				setUserNameToBlock('');
				fetchBlockedUsers();
			} else {
				console.error('Failed to block user:', data.message);
			}
		} catch (error) {
			console.error('Error while blocking user:', error);
		}
	};

	return (
		<div>
			<h1>Blocked Users:</h1>
			<div>
				<input
					type="text"
					value={userNameToBlock}
					onChange={(e) => setUserNameToBlock(e.target.value)}
					placeholder="Enter username to block"
				/>
				<button onClick={blockUser}>Block User</button>
			</div>
			{isLoading ? (
				<p>Loading...</p>
			) : (
				<ul>
					{blockedUsers.length > 0 ? (
						blockedUsers.map((user) => (
							<li key={user.id}>
								{user.name}
								<button onClick={() => unblockUser(user.id)}>Unblock</button>
							</li>
						))
					) : (
						<p>No users blocked.</p>
					)}
				</ul>
			)}
		</div>
	);
};

export default IgnoreList;
