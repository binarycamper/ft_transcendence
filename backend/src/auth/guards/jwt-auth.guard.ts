import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	private readonly logger = new Logger(JwtAuthGuard.name);

	handleRequest(err, user, info) {
		// Log the error and info for debugging
		if (err) {
			this.logger.log(`Authentication Error: ${err.message}`, err.stack);
		}
		if (info) {
			this.logger.log(`Auth Info: ${info.message}`);
		}

		// Log the user object if it is present
		if (user) {
			this.logger.log(`Authenticated User: ${JSON.stringify(user)}`);
		} else {
			this.logger.log(`User not authenticated`);
		}

		// You can throw an exception based on either "info" or "err" arguments
		if (err || !user) {
			this.logger.log('JWT Guard error!!!');
			throw err || new UnauthorizedException();
		}

		return user;
	}
}
