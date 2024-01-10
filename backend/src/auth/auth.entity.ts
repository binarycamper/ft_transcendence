import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class AuthToken {
	@PrimaryGeneratedColumn()
	id: string;

	@ManyToOne(() => User, (user) => user, {
		nullable: true,
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'userId' }) // This specifies the column that will hold the foreign key
	user: User;

	@Column({ nullable: true })
	userId: string;

	@Column()
	token: string;

	@Column({ nullable: true })
	TFASecret?: string;
}
