//matchmaking.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Matchmaking } from './matchmaking.entity';
import { MatchmakingService } from './matchmaking.service';
import { UserModule } from 'src/user/user.module';
import { MatchmakingController } from './matchmaking.controller';
import { UserService } from 'src/user/user.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Matchmaking]),
		UserModule,
		// Other necessary modules
	],
	providers: [MatchmakingService],
	controllers: [MatchmakingController],
	exports: [MatchmakingService],
})
export class MatchmakingModule {}
