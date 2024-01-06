import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { ChatRoom } from './chatRoom.entity';
import { IsUUID } from 'class-validator';

@Entity()
export class Mute {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	@IsUUID()
	userId: string;

	@ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.mutes)
	chatRoom: ChatRoom;

	@Column()
	endTime: Date; // Timestamp until the user is muted
}
