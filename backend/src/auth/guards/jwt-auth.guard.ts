// import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';

// @Injectable()
// export class JwtAuthGuard extends AuthGuard('jwt') {
// 	private readonly logger = new Logger(JwtAuthGuard.name);

// 	handleRequest(err, user, info) {
// 		// Vereinfachtes Logging für Fehler und Informationen
// 		if (err) {
// 			this.logger.log(`Authentication Error: ${err.message}`, err.stack);
// 		}
// 		if (info) {
// 			this.logger.log(`Auth Info: ${info.message}`);
// 		}

// 		// Logge nur die Benutzer-ID oder einen Benutzernamen
// 		if (user) {
// 			this.logger.log(`Authenticated User ID: ${user.id}`);
// 		} else {
// 			this.logger.log(`User not authenticated`);
// 		}

// 		// Überarbeitete Fehlerbehandlung
// 		if (err || !user) {
// 			this.logger.log('JWT Guard authentication failed');
// 			throw new UnauthorizedException('Authentication failed');
// 		}

// 		return user;
// 	}
// }

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../../user/user.entity'; // Importieren Sie den tatsächlichen User-Entity-Typ, falls verfügbar

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	private readonly logger = new Logger(JwtAuthGuard.name);

	handleRequest<TUser = User>(err: unknown, user: unknown, info: unknown): TUser {
		// Vereinfachtes Logging für Fehler und Informationen
		if (err instanceof Error) {
			this.logger.log(`Authentication Error: ${err.message}`, err.stack);
		}
		if (info instanceof Error) {
			this.logger.log(`Auth Info: ${info.message}`);
		}

		// Typüberprüfung für `user`
		if (user && typeof user === 'object' && 'id' in user) {
			const userWithId = user as { id: string };
			this.logger.log(`Authenticated User ID: ${userWithId.id}`);
		} else {
			this.logger.log(`User not authenticated`);
		}

		// Überarbeitete Fehlerbehandlung
		if (err || !user) {
			this.logger.log('JWT Guard authentication failed');
			throw new UnauthorizedException('Authentication failed');
		}

		return user as TUser;
	}
}
