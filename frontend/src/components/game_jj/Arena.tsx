import '../../css/game.css'; // Assuming you'll put the CSS in this file
import Paddle from './Paddle';

const Arena = () => {
	// Example positions and dimensions, you'll likely have these in state or context
	const paddleHeight = 50;
	const gameWidth = 600; // Assuming this matches your arena's width
	const gameHeight = 400; // Assuming this matches your arena's height
	const playerPaddlePosition = 200; // This should be a state variable
	const enemyPaddlePosition = 200; // This should also be a state variable

	return (
		<div className="game-arena">
			<Paddle
				position={playerPaddlePosition}
				isLeft={true}
				gameWidth={gameWidth}
				gameHeight={gameHeight}
			/>
			<Paddle
				position={enemyPaddlePosition}
				isLeft={false}
				gameWidth={gameWidth}
				gameHeight={gameHeight}
			/>
			{/* Other game elements */}
		</div>
	);
};

export default Arena;
