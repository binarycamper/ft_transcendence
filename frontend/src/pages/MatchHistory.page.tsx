import { useEffect, useState } from 'react';
import useTitle from '../hooks/useTitle';
import { Container, Title, Table } from '@mantine/core';

type Match = {
	date: string; // or Date if you are using actual Date objects
	opponent: string;
	result: string;
	score: string; // or number, depending on what data type you use for scores
	// Add more fields as necessary
};

export function MatchHistory() {
	useTitle('Match History');

	// Placeholder data structure, replace with your actual data retrieval logic
	const [matches, setMatches] = useState<Match[]>([]);

	useEffect(() => {
		// Fetch match history data and set it to state
		// setMatches(fetchedData);
	}, []);

	if (matches.length === 0) {
		return <div>Loading match history...</div>;
	}

	return (
		<Container my={'10vh'} size={'lg'}>
			<Title>Match History</Title>
			<Table striped highlightOnHover>
				<thead>
					<tr>
						<th>Date</th>
						<th>Opponent</th>
						<th>Result</th>
						<th>Score</th>
						// Add more columns as needed
					</tr>
				</thead>
				<tbody>
					{matches.map((match, index) => (
						<tr key={index}>
							<td>{match.date}</td>
							<td>{match.opponent}</td>
							<td>{match.result}</td>
							<td>{match.score}</td>
							// Add more data as needed
						</tr>
					))}
				</tbody>
			</Table>
		</Container>
	);
}
