import React from 'react';
import '../../css/game.css';

interface PaddleProps {
	position: number; // Vertical position of the paddle
	isLeft: boolean; // Determines if the paddle is on the left or right
	gameWidth: number; // Width of the game arena
	gameHeight: number; // Height of the game arena
}

const Paddle: React.FC<PaddleProps> = ({ position, isLeft, gameWidth, gameHeight }) => {
	const paddleWidth = 10; // Width of the paddle, you can adjust this as needed
	const paddleHeightPercentage = 20; // Paddle height as a percentage of game height
	const paddleHeight = (gameHeight * paddleHeightPercentage) / 100; // Calculate relative height

	const paddleStyle = {
		position: 'absolute',
		width: `${paddleWidth}px`,
		height: `${paddleHeight}px`, // Now this is responsive to gameHeight
		backgroundColor: 'black',
		left: isLeft ? '0px' : `calc(100% - ${paddleWidth}px)`, // Correctly aligns the right paddle
		top: `50%`,
		transform: `translateY(-50%) translateY(${position}px)`, // Adjusts for the paddle's height
	};

	return <div className="paddle" style={paddleStyle} />;
};

export default Paddle;
