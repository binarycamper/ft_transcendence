import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	private readonly logger = new Logger(JwtAuthGuard.name);

	handleRequest(err, user, info) {
		// Vereinfachtes Logging für Fehler und Informationen
		if (err) {
			this.logger.log(`Authentication Error: ${err.message}`, err.stack);
		}
		if (info) {
			this.logger.log(`Auth Info: ${info.message}`);
		}

		// Logge nur die Benutzer-ID oder einen Benutzernamen
		if (user) {
			this.logger.log(`Authenticated User ID: ${user.id}`);
		} else {
			this.logger.log(`User not authenticated`);
		}

		// Überarbeitete Fehlerbehandlung
		if (err || !user) {
			this.logger.log('JWT Guard authentication failed');
			throw new UnauthorizedException('Authentication failed');
		}

		return user;
	}
}
