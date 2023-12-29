import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity'; // Pfad zur User Entity anpassen

@Entity()
export class Match {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'playerOneId' })
	playerOne: User;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'playerTwoId' })
	playerTwo: User;

	@Column({ default: false })
	isCompleted: boolean;

	@Column({ type: 'timestamp', nullable: true })
	startTime: Date;

	@Column({ type: 'timestamp', nullable: true })
	endTime: Date;

	@Column({ nullable: true })
	result: string;
}
