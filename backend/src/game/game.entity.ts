//game.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from 'src/user/user.entity';

@Entity()
export class Game {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => User, (user) => user.gamesAsPlayerOne)
	playerOne: User;

	@Column({ default: false })
	acceptedOne: boolean;

	@ManyToOne(() => User, (user) => user.gamesAsPlayerTwo)
	playerTwo: User;

	@Column({ default: false })
	acceptedTwo: boolean;

	@Column({ default: false })
	started: boolean;

	@Column({ default: 0 })
	scorePlayerOne: number;

	@Column({ default: 0 })
	scorePlayerTwo: number;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	startTime: Date;

	@Column({ type: 'timestamp', nullable: true })
	endTime: Date;

	@Column({ nullable: true })
	winnerId: string;

	@Column({ default: 0 }) // Default position for left paddle
	playerOnePaddle: number;

	@Column({ default: 0 }) // Default position for right paddle
	playerTwoPaddle: number;

	@Column({ default: false }) //GameMode On Off
	gameMode: boolean;

	@Column('int', { array: true, default: () => "'{600,400}'" })
	ballPosition: number[];
}
