import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

type Friend = {
	email: string;
	id: string;
	customImage: string;
	intraImage: string;
	ladderLevel: number;
	gamesLost: number;
	name: string;
	nickname: string;
	status: string;
	gamesWon: number;
};

// type PublicProfileProps = {
// 	friendName: string;
// };

export const PublicProfile = () => {
	const [friendProfile, setFriendProfile] = useState<Friend | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const location = useLocation();
	const friendName = location.state?.friendName;

	useEffect(() => {
		const fetchFriendProfile = async () => {
			setIsLoading(true);
			try {
				const response = await fetch(
					`http://localhost:8080/user/publicprofile?friendname=${friendName}`,
					{
						method: 'GET',
						credentials: 'include',
						headers: {
							'Content-Type': 'application/json',
						},
					},
				);

				if (!response.ok) {
					throw new Error('Network response was not ok');
				}

				const friendProfileData: Friend = await response.json();
				setFriendProfile(friendProfileData);
			} catch (error) {
				console.error(`There was an error fetching the friend profile: ${error}`);
			} finally {
				setIsLoading(false);
			}
		};

		fetchFriendProfile();
	}, [friendName]);

	if (isLoading) {
		return <p>Loading...</p>;
	}

	return (
		<div>
			{friendProfile && (
				<div>
					<h3>{friendProfile.nickname || friendProfile.name}'s Profile</h3>
					<img
						src={friendProfile.customImage || friendProfile.intraImage}
						alt={`${friendProfile.nickname || friendProfile.name}'s profile`}
					/>
					<p>Email: {friendProfile.email}</p>
					<p>Status: {friendProfile.status}</p>
					<p>Ladder Level: {friendProfile.ladderLevel}</p>
					<p>Wins: {friendProfile.gamesWon}</p>
					<p>Losses: {friendProfile.gamesLost}</p>
				</div>
			)}
		</div>
	);
};
