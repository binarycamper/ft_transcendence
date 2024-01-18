import { User } from 'src/user/user.entity';
import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm';

@Entity()
export class History {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => User)
	@JoinColumn()
	playerOne: User;

	@ManyToOne(() => User)
	@JoinColumn()
	playerTwo: User;

	@Column({ default: 0 })
	scorePlayerOne: number;

	@Column({ default: 0 })
	scorePlayerTwo: number;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	startTime: Date;

	@Column({ type: 'timestamp', nullable: true })
	endTime: Date;

	@Column({ type: 'int', nullable: true }) // Storing time played as an integer of seconds
	timePlayed: number;

	@Column({ nullable: true })
	winnerId: string;
}
