// src/contexts/GameDataContext.tsx
import React, { createContext, useState, useContext } from 'react';

interface Player {
	id: string;
	name: string;
}

// ... [GameData interface here] ...
interface GameData {
	id: string;
	playerOne: Player;
	acceptedOne: boolean;
	playerTwo: Player;
	acceptedTwo: boolean;
	started: boolean;
	scorePlayerOne: number;
	scorePlayerTwo: number;
	startTime: Date;
	endTime: Date | null;
	winnerId: string | null;
	playerOnePaddle: number;
	playerTwoPaddle: number;
	gameMode: boolean;
	ballPosition: number[];
	ballDirection: number[];
	ballSpeed: number;
	playerOneGameWidth: number | null;
	playerOneGameHeight: number | null;
	playerTwoGameWidth: number | null;
	playerTwoGameHeight: number | null;
}

interface GameDataContextType {
	game: GameData | null;
	setGame: React.Dispatch<React.SetStateAction<GameData | null>>;
}

const GameDataContext = createContext<GameDataContextType | undefined>(undefined);

interface ProviderProps {
	children: React.ReactNode; // This is the type for children in React
}

export const GameDataProvider: React.FC<ProviderProps> = ({ children }) => {
	const [game, setGame] = useState<GameData | null>(null);

	return <GameDataContext.Provider value={{ game, setGame }}>{children}</GameDataContext.Provider>;
};

export const useGameData = () => {
	const context = useContext(GameDataContext);
	if (context === undefined) {
		throw new Error('useGameData must be used within a GameDataProvider');
	}
	return context;
};
