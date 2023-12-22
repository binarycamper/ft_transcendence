import { useNavigate } from 'react-router-dom';
import useFetchFriendList from '../hooks/useFetchFriendList';

const styles: { [key: string]: React.CSSProperties } = {
	container: {
		padding: '20px',
		backgroundColor: 'transparent',
	},
	heading: {
		color: '#fff',
	},
	friendRequestNotification: {
		cursor: 'pointer',
		color: 'white',
		backgroundColor: '#17a2b8',
		padding: '10px',
		borderRadius: '5px',
		margin: '10px 0',
		textAlign: 'center',
		width: 'auto',
		display: 'inline-block',
	},
	input: {
		padding: '10px',
		marginRight: '10px',
		borderRadius: '5px',
		border: '1px solid #ddd',
	},
	addButton: {
		backgroundColor: '#28a745',
		color: 'white',
		padding: '10px 20px',
		border: 'none',
		borderRadius: '5px',
		cursor: 'pointer',
	},
	successMessage: {
		color: '#28a745',
	},
	errorMessage: {
		color: '#dc3545',
	},
	friendListItem: {
		cursor: 'pointer',
		backgroundColor: 'transparent',
		padding: '10px',
		margin: '10px 0',
		borderRadius: '5px',
		boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
	},
	removeButton: {
		backgroundColor: '#dc3545',
		color: 'white',
		padding: '5px 10px',
		border: 'none',
		borderRadius: '5px',
		cursor: 'pointer',
		marginLeft: '10px',
	},
};

export function FriendList() {
	const navigate = useNavigate();
	const {
		addFriend,
		error,
		friendProfile,
		friends,
		handleFriendClick,
		isLoading,
		newFriendName,
		pendingRequestCount,
		removeFriend,
		setNewFriendName,
		successMessage,
	} = useFetchFriendList();

	return (
		<div style={styles.container}>
			<h1 style={styles.heading}>My Friends</h1>
			{pendingRequestCount > 0 && (
				<div onClick={() => navigate('/friendrequest')} style={styles.friendRequestNotification}>
					You have {pendingRequestCount} friend request(s). Click here to review.
				</div>
			)}
			<div style={{ margin: '20px 0' }}>
				<input
					type="text"
					placeholder="Enter friend's name"
					value={newFriendName}
					onChange={(e) => setNewFriendName(e.target.value)}
					style={styles.input}
				/>
				<button onClick={addFriend} style={styles.addButton}>
					Add New Friend
				</button>
			</div>
			{successMessage && (
				<p className="success" style={styles.successMessage}>
					{successMessage}
				</p>
			)}
			{error && <p style={styles.errorMessage}>{error}</p>}
			{isLoading ? (
				<p>Loading...</p>
			) : (
				<ul style={{ listStyleType: 'none', padding: 0 }}>
					{friends.map((friend) => (
						<li key={friend.id} style={styles.friendListItem}>
							<div onClick={() => handleFriendClick(friend.name)} style={{ cursor: 'pointer' }}>
								{friend.name} - {friend.status}
							</div>
							<button onClick={(e) => removeFriend(e, friend.id)} style={styles.removeButton}>
								Remove
							</button>
						</li>
					))}
				</ul>
			)}
			{friendProfile && (
				<div>
					<h3>{friendProfile.nickname || friendProfile.name}'s Profile</h3>
					<img
						src={friendProfile.image ? friendProfile.image : friendProfile.imageUrl}
						alt={`${friendProfile.nickname || friendProfile.name}'s profile`}
					/>
					<p>Email: {friendProfile.email}</p>
					<p>Status: {friendProfile.status}</p>
					<p>Ladder Level: {friendProfile.ladderLevel}</p>
					<p>Wins: {friendProfile.wins}</p>
					<p>Losses: {friendProfile.losses}</p>
					{/* Render additional details here */}
				</div>
			)}
		</div>
	);
}
