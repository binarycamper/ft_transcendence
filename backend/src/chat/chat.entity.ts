import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Chat {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	senderId: string;

	@Column()
	receiverId: string;

	@Column({ type: 'enum', enum: ['friend_request', 'system_message'] })
	messageType: string;

	@Column()
	content: string;

	@Column({ type: 'enum', enum: ['pending', 'accepted', 'declined'] })
	status: string;
}
