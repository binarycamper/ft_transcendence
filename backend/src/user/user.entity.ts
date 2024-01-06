import { IsEmail } from 'class-validator';
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
	@IsEmail()
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
	blocklist: User[];

	@Column()
	intraId: string;

	@Column({ nullable: true, type: 'varchar' })
	intraImage: string;

	@Column({ nullable: true, type: 'varchar' })
	customImage: string;

	@Column({ default: false })
	has2FA: boolean;

	@Column({ nullable: true })
	TFASecret?: string;

	@Column({ nullable: true })
	unconfirmed2FASecret?: string;

	//Game Stats:
	@Column({ default: 0 })
	gamesWon: number;

	@Column({ default: 0 })
	gamesLost: number;

	@Column({ default: 1 }) // Assuming ladder level starts at 1
	ladderLevel: number;

	@Column('simple-array', { default: '' })
	achievements: string[] = [];

	@ManyToMany(() => ChatRoom, (chatRoom) => chatRoom.users)
	chatRooms: ChatRoom[];
}
