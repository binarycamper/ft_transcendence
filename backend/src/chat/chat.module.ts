// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { FriendRequest } from './friendRequest.entity'; // Update with the correct import path
import { UserModule } from 'src/user/user.module';
import { ChatMessage } from './chat.entity';
import { JwtModule } from '@nestjs/jwt';
import { User } from 'src/user/user.entity';
import { ChatRoom } from './chatRoom.entity';
import { Mute } from './mute.entity';

@Module({
	imports: [
		UserModule,
		TypeOrmModule.forFeature([FriendRequest, ChatMessage, User, ChatRoom, Mute]),
		JwtModule.register({
			secret: process.env.JWT_SECRET, // The secret key to sign the JWTs
			signOptions: { expiresIn: '1d' },
		}),
	],
	providers: [ChatService],
	controllers: [ChatController],
	exports: [ChatService],
})
export class ChatModule {}
