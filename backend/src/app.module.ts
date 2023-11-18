import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user/user.service';
import { User } from './user/user.entity';
import { UserController } from './user/user.controller';

@Module({
  imports: [TypeOrmModule.forRoot({
	type: 'postgres',
	host: process.env.POSTGRES_HOST,
	port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
	username: process.env.POSTGRES_USER,
	password: process.env.POSTGRES_PASSWORD,
	database: process.env.POSTGRES_DB,
	entities: [__dirname + '/**/*.entity{.ts,.js}'],
	synchronize: true, // set to false in production
}),
	TypeOrmModule.forFeature([User]),
],
  controllers: [AppController, UserController],
  providers: [AppService, UserService],
})
export class AppModule {}