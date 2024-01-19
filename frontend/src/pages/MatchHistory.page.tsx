import { useEffect, useState } from 'react';
import useTitle from '../hooks/useTitle';
import { Container, Title, Table } from '@mantine/core';

type MatchHistoryItem = {
	date: string;
	opponent: string;
	result: string;
	score: string;
};

type History = {
	id: string;
	playerOne: { id: string; name: string };
	playerTwo: { id: string; name: string };
	scorePlayerOne: number;
	scorePlayerTwo: number;
	startTime: string;
	endTime: string;
	timePlayed: string;
	winnerId: string;
};

export function MatchHistory() {
	useTitle('Match History');
	const [loading, setLoading] = useState(true);
	const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
	const [userId, setUserId] = useState<string | null>(null);

	async function getUserIdFromServer() {
		try {
			const response = await fetch('http://localhost:8080/user/id', {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const text = await response.text();
			if (!text) {
				throw new Error('Response body is empty');
			}
			try {
				const data = JSON.parse(text);
				return data;
			} catch (error) {
				throw new Error('Failed to parse JSON response');
			}
		} catch (error) {
			console.error('Error fetching user ID:', error);
			throw error;
		}
	}

	useEffect(() => {
		const fetchUserId = async () => {
			try {
				const data = await getUserIdFromServer();
				setUserId(data.id);
			} catch (error) {
				console.error('Error retrieving user ID:', error);
			}
		};

		fetchUserId();
	}, []);

	useEffect(() => {
		const fetchMatchHistory = async () => {
			if (!userId) return;

			try {
				const response = await fetch('http://localhost:8080/pong/all-history', {
					method: 'GET',
					credentials: 'include',
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const text = await response.text();
				if (!text) {
					// If the response body is empty
					setMatches([]);
					return;
				}

				try {
					const data: History[] = JSON.parse(text);
					if (data.length === 0) {
						setMatches([]);
						setLoading(false);

						return;
					}
					const mappedData = data.map((history) => ({
						date: new Date(history.startTime).toISOString().replace('T', ' ').slice(0, -5),
						opponent: history.playerTwo.name,
						result: history.winnerId === userId ? 'Won' : 'Lost',
						score: `${history.scorePlayerOne} - ${history.scorePlayerTwo}`,
					}));
					setMatches(mappedData);
				} catch (error) {
					console.error('Failed to parse JSON response:', error);
					setMatches([]);
				}
			} catch (error) {
				console.error('Fetch error: ', error);
			} finally {
				setLoading(false);
			}
		};

		fetchMatchHistory();
	}, [userId]);

	if (loading) {
		return <div>Loading match history...</div>;
	}

	if (matches.length === 0) {
		return <div>Loading match history...</div>;
	}

	const rows = matches.map((match, index) => (
		<Table.Tr key={index}>
			<Table.Td>{match.date}</Table.Td>
			<Table.Td>{match.result}</Table.Td>
			<Table.Td>{match.opponent}</Table.Td>
			<Table.Td>{match.score}</Table.Td>
		</Table.Tr>
	));

	return (
		<Container my={'2vh'} size={'md'}>
			<Title>Match History</Title>
			<Table
				striped
				highlightOnHover
				withTableBorder
				withColumnBorders
				stickyHeader
				stickyHeaderOffset={60}
			>
				<Table.Thead>
					<Table.Tr>
						<Table.Th>Date</Table.Th>
						<Table.Th>Result</Table.Th>
						<Table.Th>Opponent</Table.Th>
						<Table.Th>Score</Table.Th>
					</Table.Tr>
				</Table.Thead>
				<Table.Tbody>{rows}</Table.Tbody>
			</Table>
		</Container>
	);
}
