// src/hooks/useFetchData.ts
import { useEffect } from 'react';
import { useUser } from './UserContext';
import { useGameData } from './GameDataContext';
// Import additional contexts or states if necessary

const useFetchData = () => {
	const { setCurrUser } = useUser();
	const { setGame } = useGameData();
	// Ensure other states like setGameMode, setIsPlayerOne, etc., are defined

	useEffect(() => {
		const fetchGameData = async () => {
			try {
				// Fetch user data
				const userResponse = await fetch('http://localhost:8080/user/id', {
					credentials: 'include',
				});
				if (!userResponse.ok) throw new Error('Failed to fetch user ID');
				const userData = await userResponse.json();
				setCurrUser(userData);

				// Fetch game data
				const gameResponse = await fetch('http://localhost:8080/game/my-game', {
					credentials: 'include',
				});
				if (!gameResponse.ok) throw new Error('Failed to fetch game data');
				const gameData = await gameResponse.json();
				setGame(gameData);
			} catch (error) {
				console.error('Error fetching data:', error);
				window.location.href = 'http://localhost:5173/';
			}
		};

		fetchGameData();
	}, []);
};

export default useFetchData;
