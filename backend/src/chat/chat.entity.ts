import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class ChatMessage {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	senderId: string;

	@Column()
	receiverId: string;

	@Column('text')
	messageContent: string;

	@CreateDateColumn()
	timestamp: Date;

	@Column({ nullable: true })
	chatRoomId?: number;
}
