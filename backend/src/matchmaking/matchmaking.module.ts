import { Module } from '@nestjs/common';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './matchmaking.entity';
import { User } from '../user/user.entity';
import { UserModule } from 'src/user/user.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
	imports: [
		UserModule,
		TypeOrmModule.forFeature([Match, User]),
		JwtModule.register({
			secret: process.env.JWT_SECRET,
			signOptions: { expiresIn: '1d' },
		}),
	],
	controllers: [MatchmakingController],
	providers: [MatchmakingService],
	exports: [MatchmakingService],
})
export class MatchmakingModule {}
