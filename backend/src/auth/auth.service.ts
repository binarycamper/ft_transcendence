import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthToken } from './auth.entity';
import { User } from '../user/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import axios from 'axios';
import { use } from 'passport';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>, // Inject the userRepository
		@InjectRepository(AuthToken)
		private readonly authTokenRepository: Repository<AuthToken>, // Inject the authTokenRepository
		private readonly httpService: HttpService,
		private readonly configService: ConfigService,
		private readonly jwtService: JwtService,
	) {}

	async authenticate(
		code: string,
	): Promise<{ access_token?: string; require2FA?: boolean; userId?: string }> {
		try {
			const clientId = this.configService.get<string>('INTRA_UID');
			const clientSecret = this.configService.get<string>('INTRA_SECRET');

			// Exchange the code for an access token
			const tokenResponse = await axios.post(
				'https://api.intra.42.fr/oauth/token',
				{
					grant_type: 'authorization_code',
					client_id: clientId,
					client_secret: clientSecret,
					code,
					redirect_uri: 'http://localhost:8080/auth/callback',
				},
			);

			const accessToken: string = tokenResponse.data.access_token;

			// Fetch user data from 42 API using the accessToken
			const userResponse = await this.httpService
				.get('https://api.intra.42.fr/v2/me', {
					headers: { Authorization: `Bearer ${accessToken}` },
				})
				.toPromise();

			const userData = userResponse.data;

			// Check if user exists in your database, if not, create them
			let user = await this.userRepository.findOne({
				where: { intraId: userData.id },
			});

			const userPayload = {
				name: userData.login,
				email: userData.email,
				password: 'hashed-password', // Todo:Replace with actual hashed password
				intraId: userData.id,
				imageUrl: userData.image?.versions?.medium, // Use optional chaining
			};

			if (!user) {
				user = this.userRepository.create(userPayload);
			} else {
				// Update existing user
				this.userRepository.merge(user, userPayload);
			}

			await this.userRepository.save(user);

			// Create and save the auth token
			let authToken = await this.authTokenRepository.findOne({
				where: { user: user },
			});

			if (!authToken) {
				authToken = this.authTokenRepository.create({
					token: accessToken, // Save the plain access token
					userId: user.id,
					user: user,
				});
			} else {
				// If token exists, update it
				authToken.token = accessToken;
			}

			await this.authTokenRepository.save(authToken);

			if (user.isTwoFactorAuthenticationEnabled) {
				// Wenn 2FA aktiviert ist, geben Sie zurück, dass eine 2FA-Überprüfung erforderlich ist
				return { require2FA: true, userId: user.id }; // Fügen Sie die Benutzer-ID hinzu, um sie später zu verwenden
			}
			// Generate JWT for the client
			const payload = { username: user.name, sub: user.id };
			const jwtToken = this.jwtService.sign(payload);

			return { access_token: jwtToken };
		} catch (error) {
			console.error(error);
			if (error.response && error.response.status === 401) {
				throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
			} else {
				throw new HttpException(
					'Failed authentication',
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}
		}
	}

	async generateNewAccessToken(refreshToken: string): Promise<string | null> {
		try {
			// Verify the refresh token
			const decoded = this.jwtService.verify(refreshToken);

			// Check if the user still exists in your DB
			const user = await this.userRepository.findOne({
				where: { id: decoded.sub },
			});
			if (!user) {
				console.log('User not found for the provided refresh token.');
				return null;
			}

			// Create a new JWT payload
			const payload = { username: user.name, sub: user.id };

			// Generate a new access token
			const newAccessToken = this.jwtService.sign(payload);

			return newAccessToken;
		} catch (error) {
			console.log('Invalid refresh token:', error.message);
			return null;
		}
	}

	async refreshToken(req): Promise<{ accessToken?: string; message?: string }> {
		const refreshToken = req.cookies['RefreshToken'];
		const newAccessToken = await this.generateNewAccessToken(refreshToken);
		if (newAccessToken) {
			return { accessToken: newAccessToken };
		} else {
			return { message: 'Invalid refresh token' };
		}
	}

	async verifyTwoFactorAuthenticationToken(
		token: string,
		user: User,
	): Promise<boolean> {
		// if (!user || !user.twoFactorAuthenticationSecret) {
		// 	throw new Error('User not found or 2FA not setup');
		// }

		return speakeasy.totp.verify({
			secret: user.twoFactorAuthenticationSecret,
			encoding: 'base32',
			token: token,
		});
	}

	// Methode zum Erstellen eines Zugriffstokens (falls noch nicht vorhanden)
	createAccessToken(userId: string): string {
		const payload = { sub: userId };
		return this.jwtService.sign(payload);
	}

	async setupTwoFactorAuthentication(
		user: User,
	): Promise<{ qrCodeUrl: string }> {
		// if (!user) {
		// 	throw new Error('User not found');
		// }
		const secret = speakeasy.generateSecret();
		const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
		// Save the secret temporarily or associate it with the user session
		user.unconfirmedTwoFactorSecret = secret.base32;
		await this.userRepository.save(user);
		return { qrCodeUrl };
	}

	async confirmTwoFactorAuthentication(user: User): Promise<void> {
		user.twoFactorAuthenticationSecret = user.unconfirmedTwoFactorSecret;
		user.unconfirmedTwoFactorSecret = null;
		await this.userRepository.save(user);
	}
}
