import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToMany,
	JoinTable,
} from 'typeorm';

@Entity()
export class User {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ unique: true, length: 100 })
	name: string;

	@Column({ nullable: true, unique: true, length: 100 })
	nickname: string;

	@Column({ unique: true, nullable: true, length: 100 })
	email: string;

	@Column({ select: false }) // Exclude password field by default
	password: string;

	@Column({ default: 'fresh' })
	status: string;

	@ManyToMany(() => User)
	@JoinTable()
	friends: User[];

	@Column()
	intraId: string;

	@Column({ nullable: true, type: 'varchar' })
	imageUrl: string;

	@Column({ nullable: true, type: 'varchar' })
	image: string;
}
