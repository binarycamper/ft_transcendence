// Paddle.tsx
interface PaddleProps {
	position: number;
	isLeft: boolean;
	gameWidth: number;
	gameHeight: number;
	paddleHeight: number;
}

const Paddle: React.FC<PaddleProps> = ({
	position,
	isLeft,
	gameWidth,
	gameHeight,
	paddleHeight,
}) => {
	const paddleWidthPercent = 2; // Example: paddle width is 2% of gameWidth
	const paddleOffsetPercent = 5; // Example: paddle offset from the side is 5%

	const paddleStyle = {
		top: `${(position / gameHeight) * 100}%`, // Calculate top as a percentage of gameHeight
		left: isLeft ? `${paddleOffsetPercent}%` : undefined,
		right: !isLeft ? `${paddleOffsetPercent}%` : undefined,
		width: `${(paddleWidthPercent / 100) * gameWidth}px`, // Convert width percentage to px
		height: `${(paddleHeight / gameHeight) * 100}%`, // Calculate height as a percentage of gameHeight
		// Other styles...
	};

	return <div className="paddle" style={paddleStyle} />;
};

export default Paddle;
