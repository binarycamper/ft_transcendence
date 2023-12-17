import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ChatMessage {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	senderId: number;

	@Column()
	receiverId: number;

	@Column()
	content: string;

	@CreateDateColumn()
	createdAt: Date;
}
