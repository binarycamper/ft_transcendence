import { ChatRoom } from 'src/chat/chatRoom.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';

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

	//possible status states: { fresh, online, offline }
	@Column({ default: 'fresh' })
	status: string;

	@ManyToMany(() => User)
	@JoinTable()
	friends: User[];

	@ManyToMany(() => User)
	@JoinTable()
	ignorelist: User[];

	@Column()
	intraId: string;

	@Column({ nullable: true, type: 'varchar' })
	imageUrl: string;

	@Column({ nullable: true, type: 'varchar' })
	image: string;

	@Column({ default: false })
	isTwoFactorAuthenticationEnabled: boolean;

	@Column({ nullable: true })
	twoFactorAuthenticationSecret?: string;

	@Column({ nullable: true })
	unconfirmedTwoFactorSecret?: string;

	//Game Stats:
	@Column({ default: 0 })
	wins: number;

	@Column({ default: 0 })
	losses: number;

	@Column({ default: 1 }) // Assuming ladder level starts at 1
	ladderLevel: number;

	@Column('simple-array', { default: '' })
	achievements: string[] = [];

	@ManyToMany(() => ChatRoom)
	@JoinTable()
	chatRooms: ChatRoom[];
}
