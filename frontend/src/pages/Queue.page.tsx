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
		const handleMatch = (data) => {
			if (data && data.enemyUserName && !matchFound) {
				// Check if matchFound is already set
				setinfo(`Match found against ${data.enemyUserName}`);
				setEnemyUserName(data.enemyUserName);
				setMatchFound(true);
			}
		};

		socket.on('matchFound', handleMatch);

		// Clean up the event listener when the component unmounts or if the effect is re-run
		return () => {
			socket.off('matchFound', handleMatch);
		};
	}, [socket, matchFound]); // Add matchFound to the dependency array

	const handleAcceptMatch = async () => {
		try {
			const payload = { playerTwoName: enemyUserName };
			const response = await fetch('http://localhost:8080/matchmaking/acceptMatch', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.game && data.game.accepted === true) {
					window.location.href = 'http://localhost:5173/spiel';
				} else if (response.status === 202) {
					// Queue reactivated, update UI to indicate re-joining the queue
					setIsInQueue(true);
					setinfo('You have been re-entered into the matchmaking queue.');
				} else {
					// Waiting for the other player
					setinfo('Waiting for the other player to join...');
				}
			} else {
				const errorData = await response.json();
				console.error('Failed to accept match:', errorData.message);
				setinfo('Error accepting match. Please try again.');
			}
		} catch (error) {
			console.error('Error accepting match:', error);
			setinfo('Error accepting match. Please try again.');
		}
	};

	const handleDeclineMatch = () => {
		socket.emit('declineMatch', { enemyUserName });
		setinfo('');
		leaveQueue(); // will also set isInQueue to false
		setMatchFound(false);
	};

	useEffect(() => {
		const handleGameReady = () => {
			console.log('Try redirect player!');
			// Navigate to the game page if the gameId is received
			window.location.href = `http://localhost:5173/spiel`;
		};

		socket.on('gameReady', handleGameReady);

		return () => {
			socket.off('gameReady', handleGameReady); // Corrected cleanup
		};
	}, [socket]);

	useEffect(() => {
		const handleGameLeave = () => {
			// Handle the scenario when a player leaves the game
			// Maybe navigate back to the queue or show a message
			// Example: window.location.href = 'http://localhost:5173/queue';
		};

		socket.on('playerLeft', handleGameLeave);

		return () => {
			socket.off('playerLeft', handleGameLeave); // Cleanup for playerLeft event
		};
	}, [socket]);

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
