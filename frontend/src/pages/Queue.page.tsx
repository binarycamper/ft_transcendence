import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Prompt from '../components/Prompt';
import { SocketContext } from './context/socketContext';

export const MatchmakingQueuePage = () => {
	const socket = useContext(SocketContext);
	const [isInQueue, setIsInQueue] = useState(false);
	const [queueTime, setQueueTime] = useState(
		parseInt(localStorage.getItem('queueTime') || '0', 10),
	);
	const [matchFound, setMatchFound] = useState(false);
	const [enemyUserName, setEnemyUserName] = useState('');
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
				setIsInQueue(false);
				leaveQueue();
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

	useEffect(() => {
		setQueueTime(0);
		let interval = 0;
		if (isInQueue) {
			interval = setInterval(() => {
				setQueueTime((prevTime) => {
					const newTime = prevTime + 1;
					return newTime;
				});
			}, 1000);
		} else {
			clearInterval(interval);
		}

		return () => clearInterval(interval);
	}, [isInQueue]);

	useEffect(() => {
		const handleMatch = (data: any) => {
			if (data && data.enemyUserName) {
				setinfo(`Match found against ${data.enemyUserName}`);
				setEnemyUserName(data.enemyUserName);
				setMatchFound(true);
			}
		};

		socket.on('matchFound', handleMatch);
		return () => {
			socket.off('matchFound', handleMatch);
		};
	}, [socket]);

	const handleAcceptMatch = () => {
		socket.emit('acceptMatch', { enemyUserName });
		//navigate('/spiel'); // Navigate to the game page
		window.location.href = 'http://localhost:5173/spiel';
	};

	const handleDeclineMatch = () => {
		socket.emit('declineMatch', { enemyUserName });
		leaveQueue(); // will also set isInQueue to false
		setMatchFound(false);
	};

	return (
		<div>
			<h2>Matchmaking Queue</h2>
			<h3>If you refresh or disconnect from this page, matchmaking will stop.</h3>
			{info && <div className="info">{info}</div>}

			<Prompt
				when={isInQueue}
				message="Leaving this page will remove you from the matchmaking queue. Are you sure you want to leave?"
			/>
			{!isInQueue ? (
				<button onClick={handleJoinQueue}>Join Queue</button>
			) : matchFound ? (
				<div>
					<p>Match found against {enemyUserName}</p>
					<button onClick={handleAcceptMatch}>Accept Match</button>
					<button onClick={handleDeclineMatch}>Decline Match</button>
				</div>
			) : (
				<div>
					<p>Time in Queue: {queueTime} Seconds</p>
					<p>Waiting in queue...</p>
					<button onClick={leaveQueue}>Leave Queue</button>
				</div>
			)}
		</div>
	);
};
