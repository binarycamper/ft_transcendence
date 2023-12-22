import React, { useEffect, useState } from 'react';

interface BlockedUser {
	id: string; // or string if your id is a string
	name: string;
}

const IgnoreList = () => {
	const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
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
				console.log('Blocked Users:', data); // Add this line to check the response
				setBlockedUsers(data);
			} catch (error) {
				console.error('Error fetching blocked users:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchBlockedUsers();
	}, []);

	const unblockUser = async (userId: string) => {
		try {
			const response = await fetch(`http://localhost:8080/user/unblockUser/${userId}`, {
				method: 'POST', // or 'DELETE', depending on how your backend expects to receive unblock requests
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					// Include other headers if required by your backend
				},
			});
			if (!response.ok) {
				throw new Error(`Failed to unblock user: ${response.status}`);
			}
			const data = await response.json();
			console.log(data.message); // Or set some state to show a success message

			// Filter out the unblocked user from the blockedUsers state
			setBlockedUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
		} catch (error) {
			console.error('Error unblocking user:', error);
		}
	};

	return (
		<div>
			<h1>Blocked Users:</h1>
			{isLoading ? (
				<p>Loading...</p>
			) : (
				<ul>
					{blockedUsers.length > 0 ? (
						blockedUsers.map((user) => (
							<li key={user.id}>
								{user.name}
								<button onClick={() => unblockUser(user.id)}>Unblock</button>
								{/* Add more user details if necessary */}
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
