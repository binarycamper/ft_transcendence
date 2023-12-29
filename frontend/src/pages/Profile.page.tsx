import { Container, Title } from '@mantine/core';
import handleProfileDelete from '../services/handleProfileDelete';
import use2FA from '../hooks/use2FA';
import useFetchProfile from '../hooks/useFetchProfile';
import useImage from '../hooks/useImage';
import useNickname from '../hooks/useNickname';
import useTitle from '../hooks/useTitle';

export function Profile() {
	useTitle('Profile');
	const handleToggle2FA = use2FA();
	const { profile, setProfile } = useFetchProfile();
	const { imageUrl, useNewImage, toggleImage, handleFileChange, handleImageUpload } = useImage(
		profile,
		setProfile,
	);
	const { newNickname, changeNickname, setNewNickname, errorNickname } = useNickname(
		profile,
		setProfile,
	);

	if (!profile) {
		return <div>Loading profile...</div>;
	}

	return (
		<Container my={'10vh'} size={'lg'}>
			<Title>Profile</Title>
			<img
				src={useNewImage && profile.image ? imageUrl : profile.imageUrl}
				alt={`${profile.name}'s profile`}
			/>
			{profile.image && (
				<button onClick={() => toggleImage(profile)}>
					{useNewImage ? 'Show Intra Image' : 'Show Custom Image'}
				</button>
			)}
			<p>
				Status:{' '}
				<span
					style={{
						color: profile.status === 'online' ? 'green' : 'red',
					}}
				>
					{profile.status}
				</span>
			</p>
			<p>Name: {profile.name}</p>
			<p>Nickname: {profile.nickname}</p>
			<p>Email: {profile.email}</p>
			<p>Achievements: {profile.achievements.join(', ')}</p>
			<p>Ladder Level: {profile.ladderLevel}</p>
			<p>Wins: {profile.gamesWon}</p>
			<p>Losses: {profile.gamesLost}</p>
			<input type="file" onChange={handleFileChange} />
			<button onClick={handleImageUpload}>Upload New Image</button>
			<button onClick={handleProfileDelete}>Delete My Account</button>
			<input
				type="text"
				value={newNickname}
				onChange={(e) => setNewNickname(e.target.value)}
				placeholder="Enter new nickname"
			/>
			<button onClick={changeNickname}>Change Nickname</button>
			{errorNickname && <p style={{ color: 'red' }}>{errorNickname}</p>}

			<button onClick={() => handleToggle2FA(profile.is2FAEnabled)}>
				{(profile.is2FAEnabled ? 'Disable' : 'Enable') + '2FA'}
			</button>
		</Container>
	);
}
