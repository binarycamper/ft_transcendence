// src/auth/auth.entity.ts

import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity'; // Adjust the path to your User entity
import { IsNotEmpty, IsString } from 'class-validator';

@Entity()
export class AuthToken {
	@PrimaryGeneratedColumn()
	id: string;

	@ManyToOne(() => User, (user) => user, {
		nullable: true,
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'userId' }) // This specifies the column that will hold the foreign key
	user: User;

	@Column({ nullable: true })
	userId: string;

	@Column()
	token: string;

	@Column({ nullable: true })
    twoFactorAuthenticationSecret?: string;
}
