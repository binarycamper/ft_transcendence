import useProfile from '../hooks/useProfile';
import useTitle from '../hooks/useTitle';
import handleProfileDelete from '../services/handleProfileDelete';
import { Container, Title } from '@mantine/core';

export function Profile() {
	useTitle('Profile');

	const {
		changeNickname,
		customImage,
		errorProfile,
		handleFileChange,
		handleImageUpload,
		handleToggle2FA,
		isCustomImageActive,
		newNickname,
		profile,
		setNewNickname,
		toggleProfileImage,
		has2FA,
	} = useProfile();

	if (!profile) {
		return <div>Loading profile...</div>;
	}

	return (
		<Container my={'10vh'} size={'lg'}>
			<Title>Profile</Title>
			<img
				src={isCustomImageActive && profile.customImage ? customImage : profile.intraImage}
				alt={`${profile.name}'s profile`}
			/>
			{profile.customImage && (
				<button onClick={toggleProfileImage}>
					{isCustomImageActive ? 'Show Intra Image' : 'Show Custom Image'}
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
			<p>Achievements: {profile.achievements + ', '}</p>
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
			{errorProfile && <p style={{ color: 'red' }}>{errorProfile}</p>}

			<button onClick={handleToggle2FA}>{(has2FA ? 'Disable' : 'Enable') + '2FA'}</button>
		</Container>
	);
}
