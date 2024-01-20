import React, { useEffect, useState } from 'react';
import fetchUrl from '../services/fetchUrl';

const ActiveGamesPage: React.FC = () => {
	const [games, setGames] = useState([]);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		async function fetchActiveGames() {
			setIsLoading(true);
			try {
				const response = await fetch(
					fetchUrl('8080', '/pong/active-games'), // Replace with the appropriate API endpoint
					{
						method: 'GET',
						credentials: 'include',
						headers: {
							'Content-Type': 'application/json',
						},
					},
				);

				if (!response.ok) {
					throw new Error('Failed to fetch active games');
				}

				const data = await response.json();
				console.log('Received games data:', data); // Debug log
				setGames(data);
			} catch (error) {
				console.error('Error fetching active games:', error);
				setError('Failed to load active games.');
			} finally {
				setIsLoading(false);
			}
		}

		fetchActiveGames();
	}, []);

	return (
		<div>
			<h1>Active Games</h1>
			{error && <p style={{ color: 'red' }}>{error}</p>}
			{isLoading ? (
				<p>Loading games...</p>
			) : Array.isArray(games) && games.length > 0 ? (
				games.map((game, index) => (
					<div key={index}>
						{/* Render game data here */}
						<p>
							Game URL:
							<a
								href={`http://localhost:5173/game/${game.gameURL}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								{game.gameURL}
							</a>
						</p>
						<p>PlayerOne: {game.playerOneName}</p>
						<p>PlayerTwo: {game.playerTwoName}</p> {/*handle computerhere*/}
						<p>Status: {game.status}</p>
						<p>Start Time: {new Date(game.startTime).toLocaleString()}</p>
						{/* Add more game properties as needed */}
					</div>
				))
			) : (
				<p>No active games found.</p>
			)}
		</div>
	);
};

export default ActiveGamesPage;
