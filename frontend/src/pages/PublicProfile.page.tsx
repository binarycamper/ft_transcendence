import { Tooltip } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import fetchUrl from '../services/fetchUrl';

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
	achievements: string[];
};

// type PublicProfileProps = {
// 	friendName: string;
// };

export function PublicProfile() {
	const [friendProfile, setFriendProfile] = useState<Friend | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const location = useLocation();
	const friendName = location.state?.friendName;

	useEffect(() => {
		async function fetchFriendProfile() {
			setIsLoading(true);
			try {
				const response = await fetch(
					fetchUrl('8080', `/user/public-profile?friendname=${friendName}`),
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
		}

		fetchFriendProfile();
	}, [friendName]);

	//Care if you change that here change it also in Profile.page.tsx! Ty
	function getAchievementDescription(achievement) {
		const descriptions = {
			'Room Architect 🏗️': 'Awarded for creating a chat room.',
			'Social Butterfly 🦋': 'Earned by being actively social and inviting friends to chat rooms.',
			'ChatRoom Lurker 👀': 'Given for spending a significant amount of time in chat rooms.',
			'Peacekeeper 🛡️': 'Achieved by maintaining order and decorum in chat rooms.',
			'Gamer 🎮': 'Recognized as a dedicated gamer.',
			// Add more mappings as needed
		};
		return descriptions[achievement] || 'No description available.';
	}

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
					<p>
						Achievements:{' '}
						{friendProfile.achievements.map((achievement, index) => (
							<Tooltip key={index} label={getAchievementDescription(achievement)} withArrow>
								<span>
									{achievement}
									{index < friendProfile.achievements.length - 1 ? ', ' : ''}
								</span>
							</Tooltip>
						))}
					</p>
				</div>
			)}
		</div>
	);
}
