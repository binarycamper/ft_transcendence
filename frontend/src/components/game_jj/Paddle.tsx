// Paddle.jsx
const Paddle = ({ position, isLeft }) => {
	const paddleStyle = {
		top: `${position}px`,
		left: isLeft ? '5%' : 'auto',
		right: isLeft ? 'auto' : '5%',
		width: '2%', // Adjust as per your game's design
		// Add any other styles you need for the paddle
	};

	return <div className="paddle" style={paddleStyle} />;
};

export default Paddle;
