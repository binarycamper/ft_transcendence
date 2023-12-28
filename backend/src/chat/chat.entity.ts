//chat.entity.ts
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChatRoom } from './chatRoom.entity';

@Entity()
export class ChatMessage {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	senderId: string;

	//receiverId is also Chatroom iD if message is for Chatrooms
	@Column()
	receiverId: string;

	@Column()
	content: string;

	@CreateDateColumn()
	createdAt: Date;

	@ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.messages)
	chatRoom: ChatRoom;
}
