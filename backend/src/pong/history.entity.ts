import { IsDate, IsOptional, IsUUID, Min } from 'class-validator';
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

	@Column({ default: 0, type: 'int' }) // Explicitly set the type as 'int'
	scorePlayerOne: number;

	@Column({ default: 0, type: 'int' }) // Explicitly set the type as 'int'
	scorePlayerTwo: number;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	@IsDate()
	startTime: Date;

	@Column({ type: 'timestamp', nullable: true })
	@IsDate()
	endTime: Date;

	@Column({ type: 'int', nullable: true })
	@Min(0)
	@IsOptional()
	timePlayed: number;

	@Column({ nullable: true })
	@IsUUID()
	@IsOptional()
	winnerId: string;
}
