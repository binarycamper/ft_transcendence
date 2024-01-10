//game.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './game.entity';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { User } from 'src/user/user.entity';
import { UserModule } from 'src/user/user.module';

@Module({
	imports: [UserModule, TypeOrmModule.forFeature([Game, User])],
	controllers: [GameController],
	providers: [GameService],
	exports: [GameService],
})
export class GameModule {}
