import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './guards/jwt.strategy';
import { Module } from '@nestjs/common';
import { StatusGuard } from './guards/status.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { User } from 'src/user/user.entity';

@Module({
	controllers: [AuthController],
	exports: [AuthService],
	imports: [
		TypeOrmModule.forFeature([User]),
		HttpModule,
		UserModule,
		ConfigModule.forRoot(),
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get('JWT_SECRET'), // Fetch from .env or use a default value
				signOptions: { expiresIn: '1d' },
			}),
		}),
	],
	providers: [AuthService, JwtStrategy, StatusGuard],
})
export class AuthModule {}
