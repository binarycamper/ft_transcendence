import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Prompt from '../components/Prompt';

export const MatchmakingQueuePage = () => {
	const [isInQueue, setIsInQueue] = useState(false);
	const [info, setinfo] = useState('');
	const navigate = useNavigate();

	const handleJoinQueue = async () => {
		try {
			const response = await fetch('http://localhost:8080/matchmaking/join', {
				method: 'POST', // or 'GET', depending on your backend implementation
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			if (response.ok) {
				setinfo('joined Queue');
				setIsInQueue(true);
			} else if (!response.ok) {
				setinfo('Invalid QUEUE!!!');
				//throw new Error('Network response was not ok');
			}
			// Update UI to reflect the user has joined the queue
		} catch (error) {
			setinfo(error as string);
			console.error(`There was an error joining the queue: ${error}`);
		}
	};

	const leaveQueue = async () => {
		try {
			// Call backend to remove the user from the queue
			const response = await fetch('http://localhost:8080/matchmaking/leave', {
				method: 'POST', // Assuming your backend expects a POST request to leave the queue
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			if (response.ok) {
				setinfo('not in queue');
				setIsInQueue(false);
			}
		} catch (error) {
			setinfo(error as string);
		}
	};

	useEffect(() => {
		return () => {
			leaveQueue();
		};
	}, []);

	return (
		<div>
			<h2>Matchmaking Queue</h2>
			<h3>If you refresh or disconnect to that site then matchmaking stops</h3>
			{info && <div className="info">{info}</div>}

			<Prompt
				when={isInQueue}
				message="Leaving this page will remove you from the matchmaking queue. Are you sure you want to leave?"
			/>
			{!isInQueue ? (
				<button onClick={handleJoinQueue}>Join Queue</button>
			) : (
				<div>
					<p>Waiting in queue...</p>
					<button onClick={leaveQueue}>Leave Queue</button>
				</div>
			)}

			{/* Add more UI elements here as needed, like displaying the queue status */}
		</div>
	);
};
