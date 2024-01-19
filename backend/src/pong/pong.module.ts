import { Module } from '@nestjs/common';
import { PongController } from './pong.controller';
import { PongGateway } from './pong.gateway';
import { PongService } from './pong.service';
import { UserModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { History } from './history.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
	controllers: [PongController],
	exports: [PongService],
	imports: [
		TypeOrmModule.forFeature([History]),
		UserModule,
		JwtModule.register({
			secret: process.env.JWT_SECRET,
			signOptions: { expiresIn: '1d' },
		}),
	],
	providers: [PongService, PongGateway],
})
export class PongModule {}
