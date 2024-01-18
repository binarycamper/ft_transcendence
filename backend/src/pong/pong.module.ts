import { Module } from '@nestjs/common';
import { PongController } from './pong.controller';
import { PongGateway } from './pong.gateway';
import { PongService } from './pong.service';
import { UserModule } from 'src/user/user.module';
import { ChatMessage } from 'src/chat/chat.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { History } from './history.entity';
import { User } from 'src/user/user.entity';

@Module({
	controllers: [PongController],
	exports: [PongService],
	imports: [TypeOrmModule.forFeature([History]), UserModule],
	providers: [PongService, PongGateway],
})
export class PongModule {}
