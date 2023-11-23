// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthToken } from './auth.entity';
import { UserModule } from '../user/user.module'; // Import UserModule
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigService as well
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './guards/jwt.strategy'; // Import JwtStrategy
import { StatusGuard } from './guards/status.guard';

@Module({
	imports: [
		TypeOrmModule.forFeature([AuthToken]),
		HttpModule,
		UserModule,
		ConfigModule.forRoot(),
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				secret: configService.get<string>('JWT_SECRET'), // Fetch from .env or use a default value
				signOptions: { expiresIn: '1d' },
			}),
			inject: [ConfigService],
		}),
	],
	providers: [AuthService, JwtStrategy, StatusGuard], // Add JwtStrategy to providers
	controllers: [AuthController],
})
export class AuthModule {}
