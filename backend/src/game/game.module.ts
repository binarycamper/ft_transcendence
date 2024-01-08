import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './game.entity';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { User } from 'src/user/user.entity';
import { UserModule } from 'src/user/user.module';
import { EventsModule } from 'src/events/events.module';

@Module({
	imports: [TypeOrmModule.forFeature([Game, User]), UserModule, forwardRef(() => EventsModule)],
	controllers: [GameController],
	providers: [GameService],
	exports: [GameService],
})
export class GameModule {}
