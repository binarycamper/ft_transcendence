import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ChatModule } from 'src/chat/chat.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from 'src/chat/chat.entity';
import { GameModule } from 'src/game/game.module';

@Module({
	imports: [
		UserModule,
		ChatModule,
		GameModule,
		TypeOrmModule.forFeature([ChatMessage]),
		JwtModule.register({
			secret: process.env.JWT_SECRET, // The secret key to sign the JWTs
			signOptions: { expiresIn: '1d' }, // Set an appropriate expiration time for the tokens
		}),
	],
	providers: [EventsGateway, EventsService],
	exports: [EventsGateway, EventsService],
})
export class EventsModule {}
