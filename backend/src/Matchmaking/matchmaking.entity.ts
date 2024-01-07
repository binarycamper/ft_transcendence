import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from 'src/user/user.entity';

@Entity()
export class Matchmaking {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => User)
	user: User;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	joinedAt: Date;

	@Column({ default: true })
	isActive: boolean;
}
