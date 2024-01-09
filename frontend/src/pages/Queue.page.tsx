import { useContext, useEffect, useState } from 'react';
import { SocketContext } from './context/socketContext';
import Prompt from '../components/Prompt';

export function MatchmakingQueuePage() {
	const socket = useContext(SocketContext);
	const [timer, setTimer] = useState<number | null>(null);
	const [isInQueue, setIsInQueue] = useState(false);
	const [queueTime, setQueueTime] = useState(0);
	const [matchFound, setMatchFound] = useState(false);
	const [opponentName, setOpponentName] = useState('');
	const [info, setInfo] = useState('');

	const clearMatchTimer = () => {
		if (timer !== null) {
			window.clearTimeout(timer);
			setTimer(null);
		}
	};

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
				setInfo('failed to join the queue');
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
				setInfo(`Match found against ${data.opponentName}`);
				setOpponentName(data.opponentName);
				setMatchFound(true);

				// Start a countdown timer for match acceptance
				const countdownTimer = window.setTimeout(async () => {
					// Notify the backend that the timeout has happened
					try {
						const payload = { opponentName }; // or any other info the backend might need
						const response = await fetch('http://localhost:8080/matchmaking/timeout', {
							method: 'POST',
							credentials: 'include',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(payload),
						});

						if (response.ok) {
							console.log('Backend notified about the timeout');
						} else {
							// Handle errors, if any
							console.error('Failed to notify backend about the timeout');
						}
					} catch (error) {
						console.error('Network error while notifying backend about the timeout', error);
					}

					// Additional logic after timeout notification
					setMatchFound(false);
					setIsInQueue(true);
					setInfo('Matchmaking restarted due to no response from the opponent.');
				}, 15000); // 15 seconds

				setTimer(countdownTimer);
			}
		}

		socket.on('match-found', handleMatch);

		return () => {
			socket.off('match-found', handleMatch);
			clearMatchTimer();
		};
	}, [socket, matchFound, timer]);

	async function handleAcceptMatch() {
		try {
			clearMatchTimer();
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

	useEffect(() => {
		function handleGameReady() {
			window.location.href = `http://localhost:5173/spiel`;
		}

		socket.on('game-ready', handleGameReady);

		return () => {
			socket.off('game-ready', handleGameReady); // Corrected cleanup
		};
	}, [socket]);

	useEffect(() => {
		async function handleGameLeave() {
			setMatchFound(false);
			try {
				const response = await fetch('http://localhost:8080/matchmaking/check-queue', {
					method: 'GET',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
				});
				const data = await response.json();
				if (response.ok) {
					// Update state based on backend response
					setIsInQueue(data.shouldRejoinQueue);
					setInfo(data.message);
					// If the backend says the user is in queue, start the queue timer
					if (data.shouldRejoinQueue) {
						// Call a function that handles the re-queue process
						handleJoinQueue(); // Assuming handleJoinQueue correctly handles rejoining
					}
				} else {
					// Non-200 response, handle according to your application's needs
					setInfo(data.message || 'An error occurred while checking queue status.');
				}
			} catch (error) {
				// This will handle network errors
				console.error('Network error while checking queue status', error);
				setInfo('Network error. Could not check queue status.');
			}
		}

		socket.on('matchDeclined', handleGameLeave);

		return () => {
			socket.off('matchDeclined', handleGameLeave);
		};
	}, [socket]); // Add any additional dependencies if necessary

	//will call the socket call to the function above.
	async function handleDeclineMatch() {
		try {
			clearMatchTimer();
			const payload = { playerTwoName: opponentName };
			const response = await fetch('http://localhost:8080/matchmaking/decline-match', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (response.ok) {
				const data = await response.json();
				console.log('response: ', data);
				setIsInQueue(false);
				window.location.reload();
			}
		} catch (error) {}
		/*socket.emit('decline-match', { opponentName });
		setInfo('');
		leaveQueue(); // will also set isInQueue to false
		setMatchFound(false);*/
	}

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
