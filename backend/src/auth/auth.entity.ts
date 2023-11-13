// src/auth/auth.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity'; // Adjust the path to your User entity

@Entity()
export class AuthToken {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.tokens, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) // This specifies the column that will hold the foreign key
  user: User;

  @Column({ nullable: true })
  userId: number;

  @Column()
  token: string;
}
