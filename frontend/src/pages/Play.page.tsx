import useQueue from '../hooks/useQueue';
import useTitle from '../hooks/useTitle';

export function Play() {
	const { acceptMatch, currentMatch, inQueue, joinQueue, leaveQueue, queueTime, rejectMatch } =
		useQueue();

	useTitle('Play Pong');
	return (
		<div>
			<h1>Play</h1>
			{!inQueue && <button onClick={joinQueue}>Join Matchmaking Queue</button>}
			{inQueue && <button onClick={leaveQueue}>Leave Matchmaking Queue</button>}
			{inQueue && <p>Time in Queue: {queueTime} Seconds</p>}
			{currentMatch && (
				<div>
					<p>New Match found!</p>
					<button onClick={acceptMatch}>Accept</button>
					<button onClick={rejectMatch}>Decline</button>
				</div>
			)}
		</div>
	);
}
