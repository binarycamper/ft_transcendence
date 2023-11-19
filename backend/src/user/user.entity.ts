import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';

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
	@Column()
	tokens: number;

	@Column()
	intraId: string;
}