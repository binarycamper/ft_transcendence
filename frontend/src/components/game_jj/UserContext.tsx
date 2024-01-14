// src/contexts/UserContext.tsx
import React, { createContext, useState, useContext } from 'react';

interface CurrUser {
	id: string;
	name: string;
	customImage?: string; // optional
	intraImage?: string; // optional
}

interface UserContextType {
	currUser: CurrUser | null;
	setCurrUser: React.Dispatch<React.SetStateAction<CurrUser | null>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface ProviderProps {
	children: React.ReactNode; // This is the type for children in React
}

export const UserProvider: React.FC<ProviderProps> = ({ children }) => {
	const [currUser, setCurrUser] = useState<CurrUser | null>(null);

	return <UserContext.Provider value={{ currUser, setCurrUser }}>{children}</UserContext.Provider>;
};

export const useUser = () => {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error('useUser must be used within a UserProvider');
	}
	return context;
};
