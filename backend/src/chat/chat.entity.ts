import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ChatMessage {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	senderId: string;

	@Column()
	receiverId: string;

	@Column()
	content: string;

	@CreateDateColumn()
	createdAt: Date;
}
