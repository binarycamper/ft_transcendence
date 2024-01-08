// import { User as UserEntity } from 'src/user/user.entity';

declare namespace Express {
	interface User /* extends UserEntity */ {
		achievements: string[];
		blocklist: User[];
		chatRooms: ChatRoom[];
		customImage: string;
		email: string;
		friends: User[];
		gamesAsPlayerOne: Game[];
		gamesAsPlayerTwo: Game[];
		gamesLost: number;
		gamesWon: number;
		has2FA: boolean;
		id: string;
		intraId: string;
		intraImage: string;
		ladderLevel: number;
		name: string;
		nickname: string;
		password: string;
		resetPasswordExpires: Date;
		resetPasswordToken: string;
		resetPasswordUrl: string;
		status: 'fresh' | 'online' | 'offline' | 'ingame';
		status: 'fresh' | 'online' | 'offline' | 'ingame';
		TFASecret?: string;
		unconfirmed2FASecret?: string;
	}
}
