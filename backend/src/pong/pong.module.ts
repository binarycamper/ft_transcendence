import { Module } from '@nestjs/common';
import { PongController } from './pong.controller';
import { PongGateway } from './pong.gateway';
import { PongService } from './pong.service';
import { UserModule } from 'src/user/user.module';

@Module({
	controllers: [PongController],
	exports: [PongService],
	imports: [UserModule],
	providers: [PongService, PongGateway],
})
export class PongModule {}
