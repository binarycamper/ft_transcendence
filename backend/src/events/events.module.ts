// events.module.ts
import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';
import { UserModule } from '../user/user.module'; // Import the UserModule if needed
import { JwtModule } from '@nestjs/jwt';

@Module({
	imports: [
		UserModule,
		JwtModule.register({
			secret: process.env.JWT_SECRET, // The secret key to sign the JWTs
			signOptions: { expiresIn: '1d' }, // Set an appropriate expiration time for the tokens
		}),
	], // Import UserModule if EventsService depends on it
	providers: [EventsGateway, EventsService],
})
export class EventsModule {}
