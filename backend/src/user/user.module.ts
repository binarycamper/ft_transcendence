import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from '../user/user.controller';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { AuthToken } from 'src/auth/auth.entity';

@Module({
	imports: [TypeOrmModule.forFeature([User, AuthToken])],
	exports: [TypeOrmModule, UserService],
	controllers: [UserController],
	providers: [UserService],
})
export class UserModule {}
