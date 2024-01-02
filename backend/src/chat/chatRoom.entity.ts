//chatRoom.dto.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { User } from 'src/user/user.entity';
import { ChatMessage } from './chat.entity';
import { Mute } from './mute.entity';

@Entity()
export class ChatRoom {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	name: string;

	@Column()
	type: string; // 'public', 'private'

	@Column({ nullable: true })
	password: string;

	@Column()
	ownerId: string;

	@Column()
	ownerName: string;

	@Column('simple-array')
	adminIds: string[];

	@OneToMany(() => Mute, (mute) => mute.chatRoom)
	mutes: Mute[];

	@OneToMany(() => ChatMessage, (chatMessage) => chatMessage.chatRoom)
	messages: ChatMessage[];

	@ManyToMany(() => User, (user) => user.chatRooms)
	@JoinTable()
	users: User[];
}
