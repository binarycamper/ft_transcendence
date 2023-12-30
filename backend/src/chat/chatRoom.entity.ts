//chatRoom.dto.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { User } from 'src/user/user.entity';
import { ChatMessage } from './chat.entity';

@Entity()
export class ChatRoom {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	name: string;

	@Column()
	type: string; // 'public', 'private', 'protected'

	@Column({ nullable: true })
	password: string; // For password-protected rooms

	@Column()
	ownerId: string;

	@Column('simple-array')
	adminIds: string[];

	@OneToMany(() => ChatMessage, (chatMessage) => chatMessage.chatRoom)
	messages: ChatMessage[];

	@ManyToMany(() => User, (user) => user.chatRooms)
	@JoinTable()
	users: User[];
}
