import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { JwtModule } from '@nestjs/jwt';
// import { ChatService } from './chat.service';

@Module({
	imports: [
		JwtModule.register({
			secret: process.env.JWT_SECRET, // The secret key to sign the JWTs
			signOptions: { expiresIn: '1d' }, // Set an appropriate expiration time for the tokens
		}),
	],
	controllers: [ChatController],
	// If you have services, add them to the providers array
	// providers: [ChatService],
})
export class ChatModule {}
