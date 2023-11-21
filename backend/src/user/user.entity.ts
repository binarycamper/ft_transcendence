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

	@Column({
		type: 'varchar',
		default: 'online',
	})
	status: string;

	@ManyToMany(() => User)
	@JoinTable()
	friends: User[];

	//auth stuff
	//@OneToMany(() => AuthToken, authToken => authToken.user)
	//authTokens: AuthToken[];

	@Column()
	intraId: string;
}
