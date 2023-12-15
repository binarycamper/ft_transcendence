import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from '../user/user.controller';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { AuthToken } from 'src/auth/auth.entity';
import { JwtModule } from '@nestjs/jwt';
import { FriendRequest } from 'src/chat/friendRequest.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([User, AuthToken, FriendRequest]),
		JwtModule.register({
			secret: process.env.JWT_SECRET, // The secret key to sign the JWTs
			signOptions: { expiresIn: '1d' }, // Set an appropriate expiration time for the tokens
		}),
	],
	exports: [TypeOrmModule, UserService],
	controllers: [UserController],
	providers: [UserService],
})
export class UserModule {}
