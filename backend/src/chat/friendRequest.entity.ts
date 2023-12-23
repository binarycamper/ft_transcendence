import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class FriendRequest {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	senderId: string;

	@Column()
	senderName: string;

	@Column()
	recipientId: string;

	@Column({ type: 'enum', enum: ['friend_request', 'system_message'] })
	messageType: string;

	@Column()
	content: string;

	@Column({ type: 'enum', enum: ['pending', 'accepted', 'declined'] })
	status: string;
}
