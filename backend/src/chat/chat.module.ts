import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { JwtModule } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './chat.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([ChatMessage]),
		JwtModule.register({
			secret: process.env.JWT_SECRET, // The secret key to sign the JWTs
			signOptions: { expiresIn: '1d' }, // Set an appropriate expiration time for the tokens
		}),
	],
	exports: [TypeOrmModule, ChatService],
	controllers: [ChatController],
	// If you have services, add them to the providers array
	providers: [ChatService],
})
export class ChatModule {}
