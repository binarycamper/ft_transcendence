import { AuthToken } from 'src/auth/auth.entity';
import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToMany,
	JoinTable,
	OneToMany,
} from 'typeorm';

@Entity()
export class User {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ unique: true })
	name: string;

	@Column({ unique: true, nullable: true })
	email: string;

	@Column()
	password: string;

	@Column()
	nickname: string;

	@Column({
		type: 'varchar',
		default: 'fresh',
	})
	status: string;

	@ManyToMany(() => User)
	@JoinTable()
	friends: User[];

	@Column()
	intraId: string;
}
