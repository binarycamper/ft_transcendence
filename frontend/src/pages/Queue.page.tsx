import { useEffect, useState } from 'react';
import Prompt from '../components/Prompt';
import { socket } from '../services/socket';

export function MatchmakingQueuePage() {
	const [timer, setTimer] = useState<number | null>(null);
	const [isInQueue, setIsInQueue] = useState(false);
	const [queueTime, setQueueTime] = useState(0);
	const [matchFound, setMatchFound] = useState(false);
	const [opponentName, setOpponentName] = useState('');
	const [hasAcceptedMatch, setHasAcceptedMatch] = useState(false);
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

				const countdownTimer = window.setTimeout(async () => {
					try {
						const payload = { opponentName };
						const response = await fetch('http://localhost:8080/matchmaking/timeout', {
							method: 'POST',
							credentials: 'include',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(payload),
						});

						if (response.ok) {
							const responseData = await response.json();
							console.log('Backend notified about the timeout');
							setInfo(responseData.message);

							if (responseData.inGame === false) {
								setMatchFound(false);
								setIsInQueue(responseData.shouldRejoinQueue);
							}
							// Optionally, handle other scenarios based on responseData
						} else {
							console.error('Failed to notify backend about the timeout');
							// Handle errors, if any
						}
					} catch (error) {
						console.error('Network error while notifying backend about the timeout', error);
						setInfo('Network error. Could not process timeout.');
					}
				}, 15000); // 15 seconds

				setTimer(countdownTimer);
			}
		}
		console.log('socket.id', socket.id);
		socket.on('match-found', handleMatch);

		return () => {
			socket.off('match-found', handleMatch);
			clearMatchTimer();
		};
	}, [matchFound, timer]);

	async function handleAcceptMatch() {
		try {
			clearMatchTimer();
			const payload = { opponentName: opponentName };
			const response = await fetch('http://localhost:8080/matchmaking/accept-match', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.game?.acceptedOne === true && data.game?.acceptedTwo === true) {
					window.location.href = 'http://localhost:5173/game';
				} else {
					setHasAcceptedMatch(true);
					// Set a timeout to wait for the other player
					const waitingTimer = setTimeout(async () => {
						// Notify the server to change queue.isActive to true
						try {
							const rejoinPayload = { status: 'rejoin-queue' }; // Adjust payload as needed by your backend
							const rejoinResponse = await fetch('http://localhost:8080/matchmaking/rejoin-queue', {
								method: 'POST',
								credentials: 'include',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify(rejoinPayload),
							});

							if (rejoinResponse.ok) {
								const rejoinData = await rejoinResponse.json();
								setHasAcceptedMatch(false);

								setInfo(rejoinData.message || 'Rejoined the queue.');
							} else {
								const errorData = await rejoinResponse.json();
								setInfo(errorData.message || 'Failed to rejoin the queue.');
							}
						} catch (error) {
							console.error('Error requesting to rejoin the queue:', error);
							setInfo('Network error. Could not rejoin the queue.');
						}

						setMatchFound(false);
						setIsInQueue(true);
						setInfo('The other player did not join. Rejoining the queue...');
					}, 20000); // Wait for 20 seconds

					// Save the timer ID so you can clear it if needed
					setTimer(waitingTimer);
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
			//TODO: DOubleCHeck if User is still in the matchmaking Process // fetch to server and ask!
			window.location.href = `http://localhost:5173/game`;
		}

		socket.on('game-ready', handleGameReady);

		return () => {
			socket.off('game-ready', handleGameReady); // Corrected cleanup
		};
	}, []);

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
						setHasAcceptedMatch(false);

						setMatchFound(false);
						setOpponentName('');
						handleJoinQueue();
					}
				} else {
					setInfo(data.message || 'An error occurred while checking queue status.');
				}
			} catch (error) {
				// This will handle network errors
				//console.error('Network error while checking queue status', error);
				setInfo('Network error. Could not check queue status.');
			}
		}

		socket.on('matchDeclined', handleGameLeave);

		return () => {
			socket.off('matchDeclined', handleGameLeave);
		};
	}, []); // Add any additional dependencies if necessary

	//will call the socket call to the function above.
	async function handleDeclineMatch() {
		try {
			clearMatchTimer();
			const payload = { opponentName: opponentName };
			const response = await fetch('http://localhost:8080/matchmaking/decline-match', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (response.ok) {
				const data = await response.json();
				//console.log('response: ', data);
				setHasAcceptedMatch(false);

				setIsInQueue(false);
				setMatchFound(false);
				setOpponentName('');
				setQueueTime(0);
				setInfo('');
				//window.location.reload();
			}
		} catch (error: any) {
			setInfo(error);
		}
	}

	return (
		<>
			<h2>Matchmaking Queue</h2>
			{info && <div className="info">{`INFO: ${info}`}</div>}

			<Prompt
				when={isInQueue}
				message="Leaving this page will remove you from the matchmaking queue. Are you sure you want to leave?"
			/>
			{
				!isInQueue ? (
					<button onClick={handleJoinQueue}>Join Queue</button>
				) : matchFound && !hasAcceptedMatch ? (
					// Show Accept/Decline buttons only if a match is found and not yet accepted
					<>
						<button onClick={handleAcceptMatch}>Accept Match</button>
						<button onClick={handleDeclineMatch}>Decline Match</button>
					</>
				) : isInQueue && !hasAcceptedMatch ? (
					// Show "Leave Queue" button only if in queue and match not accepted
					<>
						<h3>If you refresh or disconnect from this page, matchmaking will stop.</h3>
						<p>Time in Queue: {queueTime} Seconds</p>
						<p>Waiting in queue...</p>
						<button onClick={leaveQueue}>Leave Queue</button>
					</>
				) : null // Don't render any buttons if match is accepted
			}
		</>
	);
}
