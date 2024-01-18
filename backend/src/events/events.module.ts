// events.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';
import { UserModule } from '../user/user.module'; // Import the UserModule if needed
import { JwtModule } from '@nestjs/jwt';
import { ChatModule } from 'src/chat/chat.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from 'src/chat/chat.entity';

@Module({
	imports: [
		UserModule,
		ChatModule,
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
