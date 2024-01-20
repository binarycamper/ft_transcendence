import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { ChatRoom } from './chatRoom.entity';
import { IsDate, IsUUID } from 'class-validator';

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
	@IsDate()
	endTime: Date; // Timestamp until the user is muted
}
