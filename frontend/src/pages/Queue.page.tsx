import { useContext, useEffect, useState } from 'react';
import { SocketContext } from './context/socketContext';
import Prompt from '../components/Prompt';

export function MatchmakingQueuePage() {
	const socket = useContext(SocketContext);
	const [isInQueue, setIsInQueue] = useState(false);
	const [queueTime, setQueueTime] = useState(0);
	const [matchFound, setMatchFound] = useState(false);
	const [opponentName, setOpponentName] = useState('');
	const [info, setInfo] = useState('');

	async function handleJoinQueue() {
		try {
			const response = await fetch('http://localhost:8080/matchmaking/join', {
				method: 'POST', // or 'GET', depending on your backend implementation
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			if (response.ok) {
				setInfo('Joined Queue');
				setIsInQueue(true);
			} else if (!response.ok) {
				setInfo('Invalid Queue!!!');
				setIsInQueue(false);
				leaveQueue();
				//throw new Error('Network response was not ok');
			}
			// Update UI to reflect the user has joined the queue
		} catch (error) {
			setInfo(error as string);
			console.error(`There was an error joining the queue: ${error}`);
		}
	}

	async function leaveQueue() {
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
				setInfo('not in queue');
				setIsInQueue(false);
			}
		} catch (error) {
			setInfo(error as string);
		}
	}

	useEffect(() => {
		return () => {
			leaveQueue();
		};
	}, []);

	useEffect(() => {
		setQueueTime(0);
		let intervalId = 0;
		if (isInQueue) {
			intervalId = setInterval(() => {
				setQueueTime((prevTime) => prevTime + 1);
			}, 1000);
		} else {
			clearInterval(intervalId);
		}

		return () => clearInterval(intervalId);
	}, [isInQueue]);

	useEffect(() => {
		function handleMatch(data: any) {
			if (data?.opponentName && !matchFound) {
				// Check if matchFound is already set
				setInfo(`Match found against ${data.opponentName}`);
				setOpponentName(data.opponentName);
				setMatchFound(true);
			}
		}

		socket.on('match-found', handleMatch);

		// Clean up the event listener when the component unmounts or if the effect is re-run
		return () => {
			socket.off('match-found', handleMatch);
		};
	}, [socket, matchFound]); // Add matchFound to the dependency array

	async function handleAcceptMatch() {
		try {
			const payload = { playerTwoName: opponentName };
			const response = await fetch('http://localhost:8080/matchmaking/accept-match', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.game?.accepted === true) {
					window.location.href = 'http://localhost:5173/spiel';
				} else if (response.status === 202) {
					// Queue reactivated, update UI to indicate re-joining the queue
					setIsInQueue(true);
					setInfo('You have been re-entered into the matchmaking queue.');
				} else {
					// Waiting for the other player
					setInfo('Waiting for the other player to join...');
				}
			} else {
				const errorData = await response.json();
				console.error('Failed to accept match:', errorData.message);
				setInfo('Error accepting match. Please try again.');
			}
		} catch (error) {
			console.error('Error accepting match:', error);
			setInfo('Error accepting match. Please try again.');
		}
	}

	function handleDeclineMatch() {
		socket.emit('decline-match', { opponentName });
		setInfo('');
		leaveQueue(); // will also set isInQueue to false
		setMatchFound(false);
	}

	useEffect(() => {
		function handleGameReady() {
			console.log('Try redirect player!');
			// Navigate to the game page if the gameId is received
			window.location.href = `http://localhost:5173/spiel`;
		}

		socket.on('game-ready', handleGameReady);

		return () => {
			socket.off('game-ready', handleGameReady); // Corrected cleanup
		};
	}, [socket]);

	useEffect(() => {
		function handleGameLeave() {
			// Handle the scenario when a player leaves the game
			// Maybe navigate back to the queue or show a message
			// Example: window.location.href = 'http://localhost:5173/queue';
		}

		socket.on('player-has-left', handleGameLeave);

		return () => {
			socket.off('player-has-left', handleGameLeave); // Cleanup for player-has-left event
		};
	}, [socket]);

	return (
		<>
			<h2>Matchmaking Queue</h2>
			{info && <div className="info">{`INFO: ${info}`}</div>}

			<Prompt
				when={isInQueue}
				message="Leaving this page will remove you from the matchmaking queue. Are you sure you want to leave?"
			/>
			{!isInQueue ? (
				<button onClick={handleJoinQueue}>Join Queue</button>
			) : matchFound ? (
				<>
					<button onClick={handleAcceptMatch}>Accept Match</button>
					<button onClick={handleDeclineMatch}>Decline Match</button>
				</>
			) : (
				<>
					<h3>If you refresh or disconnect from this page, matchmaking will stop.</h3>
					<p>Time in Queue: {queueTime} Seconds</p>
					<p>Waiting in queue...</p>
					<button onClick={leaveQueue}>Leave Queue</button>
				</>
			)}
		</>
	);
}
