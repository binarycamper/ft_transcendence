interface ProfileData {
	name: string;
	nickname: string;
	email: string;
	imageUrl: string;
	image: string;
	// ... any other fields that are included in the profile data
}

function FriendProfile({ profile }: { profile: ProfileData }) {
	if (!profile) return null;

	// Default image if imageUrl is not provided
	const imageSrc = profile.image || profile.imageUrl;

	return (
		<div
			style={{ border: '1px solid #ccc', padding: '10px', marginTop: '20px' }}
		>
			{profile.imageUrl ? (
				<img
					src={profile.imageUrl}
					alt={`${profile.name}'s profile`}
					style={{ width: '100px', height: '100px' }}
				/>
			) : (
				<img
					src={imageSrc}
					alt={`${profile.name}'s profile`}
					style={{ width: '100px', height: '100px' }}
				/>
			)}
			<h2>{profile.name}</h2>
			<p>Nickname: {profile.nickname || 'Not provided'}</p>
			<p>Email: {profile.email}</p>
			{/* Additional profile fields */}
		</div>
	);
}
export default FriendProfile;
