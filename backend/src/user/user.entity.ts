import { IsEmail } from 'class-validator';
import { ChatRoom } from 'src/chat/chatRoom.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany } from 'typeorm';

@Entity()
export class User {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ unique: true, length: 8 })
	name: string;

	@Column({ nullable: true, unique: true, length: 24 })
	nickname: string;

	@Column({ unique: true, nullable: true, length: 31 })
	@IsEmail()
	email: string;

	@Column({ select: false }) // Exclude password field by default
	password: string;

	@Column({ nullable: true })
	resetPasswordToken: string;

	@Column({ nullable: true })
	resetPasswordExpires: Date;

	@Column({ nullable: true })
	resetPasswordUrl: string;

	@Column({ default: 'fresh' })
	status: 'fresh' | 'online' | 'offline' | 'ingame' | 'inqueue';

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

	/* Two Factor Authentication */
	@Column({ default: false })
	has2FA: boolean;

	@Column({ nullable: true })
	TFASecret?: string;

	@Column({ nullable: true })
	unconfirmed2FASecret?: string;

	/* Game Stats */
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
