import { useEffect, useState } from 'react';
import { socket } from '../services/socket';
import { useNavigate } from 'react-router-dom';

interface MatchDetails {
	id: string;
	playerOne: {
		name: string;
	};
	playerTwo: {
		name: string;
	};
}

export default function useQue() {
	const [inQueue, setInQueue] = useState(localStorage.getItem('inQueue') === 'true');
	const [queueTime, setQueueTime] = useState(
		parseInt(localStorage.getItem('queueTime') || '0', 10),
	);
	const [currentMatch, setCurrentMatch] = useState<MatchDetails | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		function handleMatchProposal(matchDetails: MatchDetails) {
			console.log('Match proposal received:', matchDetails);
			setCurrentMatch(matchDetails);
			// TODO: Implement a modal or some UI element to show the match proposal
		}

		socket.on('matchProposal', handleMatchProposal);
		return () => {
			socket.off('matchProposal', handleMatchProposal);
		};
	}, []);

	function acceptMatch() {
		if (currentMatch) {
			console.log('Match accepted:', currentMatch.id);
			socket.emit('respond-to-match', { matchId: currentMatch.id, accept: true });
			setCurrentMatch(null);
		}
	}

	function rejectMatch() {
		if (currentMatch) {
			socket.emit('respond-to-match', { matchId: currentMatch.id, accept: false });
			setCurrentMatch(null);
			setInQueue(false);
			localStorage.setItem('inQueue', 'false');
			setQueueTime(0);
			localStorage.setItem('queueTime', '0');
		}
	}

	useEffect(() => {
		function handleMatchStart(data: MatchDetails) {
			setInQueue(false);
			localStorage.setItem('inQueue', 'false');
			setQueueTime(0);
			localStorage.setItem('queueTime', '0');
			console.log('Match start:', data.id);
			navigate('/spiel');
		}

		function handleRemainInQueue() {
			console.log('Remain in queue');
			setInQueue(true);
			localStorage.setItem('inQueue', 'true');
		}

		socket.on('matchStart', handleMatchStart);
		socket.on('remainInQueue', handleRemainInQueue);

		return () => {
			socket.off('matchStart', handleMatchStart);
			socket.off('remainInQueue', handleRemainInQueue);
		};
	}, [navigate, socket]);

	useEffect(() => {
		async function handleMatchProposalExpired() {
			try {
				const response = await fetch(`http://localhost:8080/matchmaking/user-status`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					},
					credentials: 'include',
				});

				if (!response.ok) {
					throw new Error('Error when retrieving the user status');
				}

				const data = await response.json();
				setCurrentMatch(null);
				setInQueue(data.inQueue);
				localStorage.setItem('inQueue', data.inQueue ? 'true' : 'false');
			} catch (error) {
				console.error('Error when checking the queue status:', error);
				setCurrentMatch(null);
				setInQueue(false);
				localStorage.setItem('inQueue', 'false');
			}
		}

		socket.on('matchProposalExpired', handleMatchProposalExpired);
		return () => {
			socket.off('matchProposalExpired', handleMatchProposalExpired);
		};
	}, [socket]);

	useEffect(() => {
		async function checkInitialQueueStatus() {
			try {
				const response = await fetch(`http://localhost:8080/matchmaking/user-status`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					},
					credentials: 'include',
				});

				if (!response.ok) {
					throw new Error('Error when retrieving the queue status');
				}

				const { inQueue, matchStatus } = await response.json();
				if (inQueue) {
					setInQueue(true);
				} else if (matchStatus.inMatch) {
					// Logik für den Fall, dass bereits ein Match gefunden wurde
					console.log('Match gefunden:', matchStatus.matchDetails);
				}
			} catch (error) {
				setCurrentMatch(null);
				setInQueue(false);
				localStorage.setItem('inQueue', 'false');
			}
		}

		checkInitialQueueStatus();
	}, []);

	useEffect(() => {
		let interval = 0;
		if (inQueue) {
			interval = setInterval(() => {
				setQueueTime((prevTime) => {
					const newTime = prevTime + 1;
					localStorage.setItem('queueTime', newTime.toString());
					return newTime;
				});
			}, 1000);
		} else {
			clearInterval(interval);
			localStorage.setItem('queueTime', '0');
		}

		return () => clearInterval(interval);
	}, [inQueue]);

	useEffect(() => {
		const intervalId = setInterval(async () => {
			if (inQueue) {
				try {
					const responseMatch = await fetch(`http://localhost:8080/matchmaking/match`, {
						method: 'GET',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include',
					});

					if (!responseMatch.ok) {
						throw new Error('Error when retrieving the queue status');
					}

					const matchStatus = await responseMatch.json();
					if (matchStatus.inMatch) {
						console.log('Match found:', matchStatus.matchDetails);
						clearInterval(intervalId);
					}
				} catch (error) {
					console.error('Error:', error);
					clearInterval(intervalId);
				}
			}
		}, 5000);

		return () => clearInterval(intervalId);
	}, [inQueue]);

	async function joinQueue() {
		console.log('Joining queue...');
		setInQueue(true);
		localStorage.setItem('inQueue', 'true');
		setQueueTime(0);
		localStorage.setItem('queueTime', '0');
		socket.emit('join-queue');
	}

	async function leaveQueue() {
		console.log('Leaving queue...');
		setInQueue(false);
		localStorage.removeItem('inQueue');
		localStorage.removeItem('queueTime');
		setQueueTime(0);
		socket.emit('leave-queue');
	}

	return {
		acceptMatch,
		currentMatch,
		inQueue,
		joinQueue,
		leaveQueue,
		queueTime,
		rejectMatch,
	};
}
