// Mute.entity.ts
import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { User } from 'src/user/user.entity';
import { ChatRoom } from './chatRoom.entity';

@Entity()
export class Mute {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column('simple-array')
	userIds: string[];

	@ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.mutes)
	chatRoom: ChatRoom;

	@Column()
	endTime: Date; // Timestamp until the user is muted
}
