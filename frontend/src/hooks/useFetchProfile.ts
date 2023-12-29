import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { redirect } from 'react-router-dom';

type UserProfile = {
	achievements: string[];
	email: string;
	gamesLost: number;
	gamesWon: number;
	id: string;
	image?: string;
	imageUrl: string;
	intraId: number;
	is2FAEnabled: boolean;
	ladderLevel: number;
	name: string;
	nickname: string;
	status: string;
};

export default function useFetchProfile() {
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [is2FAEnabled, setIs2FAEnabled] = useState(false);
	const intervalRef = useRef(0);

	async function fetchImage(image: string) {
		try {
			const response = await fetch(image, {
				method: 'GET',
				credentials: 'include',
			});
			if (!response.ok) {
				throw new Error(`Image fetch failed: ${response.statusText}`);
			}
			const blob = await response.blob();
			setImageUrl(URL.createObjectURL(blob));
		} catch (error) {
			console.error('Error fetching image:', error);
		}
	}

	useLayoutEffect(() => {
		// TODO: fix hardcoded variable
		const isSubscribed = true; // This flag will prevent state updates if the component is unmounted

		async function fetchProfile() {
			// Introduce a delay before fetching profile data that database is up to date.
			const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
			await delay(500); // Wait for 0.5 seconds
			try {
				const response = await fetch('http://localhost:8080/user/profile', {
					credentials: 'include',
				});
				if (!response.ok) {
					redirect('/login');
				}
				const profileData: UserProfile = await response.json();
				if (isSubscribed) {
					setProfile(profileData);
					if (profileData.image) {
						fetchImage(profileData.image);
					}
				}

				// Set the 2FA status
				setIs2FAEnabled(profileData.is2FAEnabled);
			} catch (error) {
				console.error('Error fetching profile:', error);
				if (isSubscribed) {
					redirect('/login');
				}
			}
		}

		fetchProfile();
		/* fetch every 30 seconds, while tab is active */
		intervalRef.current = setInterval(fetchProfile, 30_000);

		return () => {
			clearInterval(intervalRef.current);
		};
	}, []);

	return { profile, setProfile };
}
