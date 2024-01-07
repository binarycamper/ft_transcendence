import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './game.entity';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { User } from 'src/user/user.entity';
import { Match } from 'src/matchmaking/matchmaking.entity';
import { EventsModule } from 'src/events/events.module';
import { UserModule } from 'src/user/user.module';
import { MatchmakingModule } from 'src/matchmaking/matchmaking.module';

@Module({
	imports: [TypeOrmModule.forFeature([Game, User, Match]), UserModule, MatchmakingModule],
	controllers: [GameController],
	providers: [GameService],
	exports: [GameService],
})
export class GameModule {}
