import {Entity,PrimaryGeneratedColumn,Column,OneToMany,OneToOne,JoinColumn,} from 'typeorm';
/*
import { ChatMessage } from '../chat-message/chat-message.entity';
import { Game } from '../game/game.entity';
import { MatchHistory } from '../match-history/match-history.entity';
*/
import { AuthToken } from '../auth/auth.entity';

@Entity()
export class User {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ unique: true, nullable: true }) // Add this line into databse in 'User' Table
	intraId: number;

	@Column({ unique: true, nullable: true })
	email: string;

	@Column({ unique: true })
	username: string;

	@Column()
	password: string; // This will store the hashed password

	@Column({ nullable: true })
	avatar?: string;

	@Column({ default: 'default-avatar.png' })
	defaultAvatar: string;

	/* **Will be used soon**

	@OneToMany(() => ChatMessage, (message) => message.user)
	messages: ChatMessage[];

	@OneToMany(() => Game, (game) => game.user)
	games: Game[];

	@OneToOne(() => MatchHistory)
	@JoinColumn()
	matchHistory: MatchHistory;
	*/

	@OneToMany(() => AuthToken, token => token.user)
	tokens: AuthToken[];

  	// ... other fields like two-factor authentication, status, etc.
}