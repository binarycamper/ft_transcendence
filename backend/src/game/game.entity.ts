import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from 'src/user/user.entity';

@Entity()
export class Game {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	// Link back to the User entity for playerOne
	@ManyToOne(() => User, (user) => user.gamesAsPlayerOne)
	playerOne: User;

	// Link back to the User entity for playerTwo
	@ManyToOne(() => User, (user) => user.gamesAsPlayerTwo)
	playerTwo: User;

	@Column()
	scorePlayerOne: number;

	@Column()
	scorePlayerTwo: number;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	startTime: Date;

	@Column({ type: 'timestamp', nullable: true })
	endTime: Date;

	@Column({ nullable: true })
	winnerId: string;

	@Column({})
	accepted: boolean;
}
