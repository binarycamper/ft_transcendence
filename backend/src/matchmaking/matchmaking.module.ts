import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Matchmaking } from './matchmaking.entity';
import { MatchmakingService } from './matchmaking.service';
import { UserModule } from 'src/user/user.module';
import { MatchmakingController } from './matchmaking.controller';
import { EventsModule } from 'src/events/events.module';
import { GameModule } from 'src/game/game.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Matchmaking]),
		UserModule,
		GameModule,
		forwardRef(() => EventsModule), // Use forwardRef here
	],
	providers: [MatchmakingService],
	controllers: [MatchmakingController],
	exports: [MatchmakingService],
})
export class MatchmakingModule {}
