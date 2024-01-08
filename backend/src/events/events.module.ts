// events.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';
import { UserModule } from '../user/user.module'; // Import the UserModule if needed
import { JwtModule } from '@nestjs/jwt';
import { ChatModule } from 'src/chat/chat.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from 'src/chat/chat.entity';
import { GameModule } from 'src/game/game.module';
import { MatchmakingModule } from 'src/matchmaking/matchmaking.module';

@Module({
	imports: [
		UserModule,
		ChatModule,
		GameModule,
		forwardRef(() => MatchmakingModule), // Use forwardRef here
		TypeOrmModule.forFeature([ChatMessage]),
		JwtModule.register({
			secret: process.env.JWT_SECRET,
			signOptions: { expiresIn: '1d' },
		}),
	],
	providers: [EventsGateway, EventsService],
	exports: [EventsGateway, EventsService],
})
export class EventsModule {}
