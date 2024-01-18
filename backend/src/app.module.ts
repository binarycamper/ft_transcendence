import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { ChatModule } from './chat/chat.module';
import { PongModule } from './pong/pong.module';
/* import { ServeStaticModule } from '@nestjs/serve-static'; */
/* import { join } from 'path'; */

@Module({
	imports: [
		EventsModule,
		TypeOrmModule.forRoot({
			type: 'postgres',
			host: process.env.POSTGRES_HOST,
			port: parseInt(process.env.POSTGRES_PORT) || 5432,
			username: process.env.POSTGRES_USER,
			password: process.env.POSTGRES_PASSWORD,
			database: process.env.POSTGRES_DB,
			entities: [`${__dirname}/**/*.entity{.ts,.js}`],
			synchronize: true,
		}),
		AuthModule,
		UserModule,
		ChatModule,
		PongModule,
		/* ServeStaticModule.forRoot({
			rootPath: join(__dirname, '../node_modules/@socket.io/admin-ui/ui/dist'),
		}), */
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
