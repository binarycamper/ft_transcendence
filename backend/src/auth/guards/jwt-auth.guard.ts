import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../../user/user.entity';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	private readonly logger = new Logger(JwtAuthGuard.name);

	handleRequest<TUser = User>(err: unknown, user: unknown, info: unknown): TUser {
		if (err instanceof Error) {
			this.logger.log(`Authentication Error: ${err.message}`, err.stack);
		}
		if (info instanceof Error) {
			this.logger.log(`Auth Info: ${info.message}`);
		}

		if (user && typeof user === 'object' && 'id' in user) {
			const userWithId = user as { id: string };
			this.logger.log(`Authenticated User ID: ${userWithId.id}`);
		} else {
			this.logger.log(`User not authenticated`);
		}

		if (err || !user) {
			this.logger.log('JWT Guard authentication failed');
			throw new UnauthorizedException('Authentication failed');
		}

		return user as TUser;
	}
}
