import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { UserService } from 'src/user/user.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		private readonly httpService: HttpService,
		private readonly configService: ConfigService,
		private userService: UserService,
		private readonly jwtService: JwtService,
	) {}

	/*
    This method is used to obtain the OAuth token from 42's API.
    */
	private async getOAuthToken(code: string): Promise<string> {
		const clientId = this.configService.get<string>('INTRA_UID');
		const clientSecret = this.configService.get<string>('INTRA_SECRET');

		const tokenResponse = await axios.post('https://api.intra.42.fr/oauth/token', {
			grant_type: 'authorization_code',
			client_id: clientId,
			client_secret: clientSecret,
			code,
			redirect_uri: 'http://localhost:8080/auth/callback',
		});

		return tokenResponse.data.access_token;
	}

	/*
    This method retrieves user data from 42's API.
    */
	private async getOAuthUserData(accessToken: string): Promise<any> {
		const userResponse = await this.httpService
			.get('https://api.intra.42.fr/v2/me', {
				headers: { Authorization: `Bearer ${accessToken}` },
			})
			.toPromise();

		return userResponse.data;
	}

	/*
    This method creates a new user or updates it if it already exists.
    */
	// private async createUserOrUpdate(userData: any): Promise<User> {
	// 	//console.log('userData= ', userData);
	// 	let user = await this.userRepository.findOne({ where: { intraId: userData.id } });
	// 	let UserId;
	// 	let state = 'fresh';
	// 	let pw = 'hashed-pw';
	// 	if (!user) {
	// 		UserId = uuidv4();
	// 	} else {
	// 		state = user.status;
	// 		UserId = user.id;
	// 		pw = user.password;
	// 	}
	// 	const userPayload = {
	// 		id: UserId,
	// 		name: userData.login,
	// 		email: userData.email,
	// 		password: pw,
	// 		status: state,
	// 		intraId: userData.id,
	// 		imageUrl: userData.image?.versions?.medium,
	// 		isTwoFactorAuthenticationEnabled: false,
	// 	};

	// 	if (!user) {
	// 		user = this.userRepository.create(userPayload);
	// 	} else {
	// 		this.userRepository.merge(user, userPayload);
	// 	}
	// 	await this.userRepository.save(user);
	// 	return user;
	// }

	private async createUserOrUpdate(userData: any): Promise<User> {
		let user = await this.userRepository.findOne({ where: { intraId: userData.id } });

		if (!user) {
			// Benutzer existiert nicht, erstelle neuen Benutzer
			const newUser = this.userRepository.create({
				id: uuidv4(),
				name: userData.login,
				email: userData.email,
				password: 'hashed-pw',
				status: 'fresh',
				intraId: userData.id,
				imageUrl: userData.image?.versions?.medium,
				isTwoFactorAuthenticationEnabled: false,
			});
			await this.userRepository.save(newUser);
			return newUser;
		} else {
			// Benutzer existiert bereits, update nur sichere Felder
			// Kein Überschreiben von isTwoFactorAuthenticationEnabled, wenn es bereits aktiviert ist
			if (!user.isTwoFactorAuthenticationEnabled) {
				user.isTwoFactorAuthenticationEnabled = false;
			}
			// Aktualisiere andere sichere Felder nach Bedarf
			await this.userRepository.save(user);
			return user;
		}
	}

	async authenticate(
		code: string,
	): Promise<{ access_token?: string; require2FA?: boolean; userId?: string }> {
		try {
			//Retrieve OAuth token and query user data
			const accessToken = await this.getOAuthToken(code);
			const intraUserData = await this.getOAuthUserData(accessToken);
			// Create or update users in the database
			const user = await this.createUserOrUpdate(intraUserData);

			// Generate and return JWT token
			const jwtToken = await this.createAccessToken(user.id);
			return { access_token: jwtToken, userId: user.id }; //TODO: why userID?? it was id everywhere or?
		} catch (error) {
			console.error(error);
			if (error.response && error.response.status === 401) {
				throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
			} else {
				throw new HttpException('Failed authentication', HttpStatus.INTERNAL_SERVER_ERROR);
			}
		}
	}

	/////////////////////// NOT USED generateNewAccessToken NOT USED ///////////////////////

	/*
    This method is used to validate the refresh token and retrieve the user from the database.
    */
	private async validateRefreshToken(refreshToken: string): Promise<User> {
		try {
			const decoded = this.jwtService.verify(refreshToken);
			const user = await this.userRepository.findOne({ where: { id: decoded.id } });

			if (!user) {
				throw new Error('User not found for the provided refresh token.');
			}

			return user;
		} catch (error) {
			console.error('Invalid refresh token:', error.message);
			throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
		}
	}

	async generateNewAccessToken(refreshToken: string): Promise<string | null> {
		try {
			const user = await this.validateRefreshToken(refreshToken);
			const payload = {
				username: user.name,
				id: user.id,
				email: user.email,
				password: user.password,
			};
			const newAccessToken = this.jwtService.sign(payload);

			return newAccessToken;
		} catch (error) {
			return null;
		}
	}

	/////////////////////// NOT USED generateNewAccessToken NOT USED ///////////////////////

	//This function is used to check the validity of the 2FA token.
	private is2FATokenValid(user: User, token: string): boolean {
		var result = speakeasy.totp.verify({
			secret: user.unconfirmedTwoFactorSecret,
			encoding: 'base32',
			token: token,
		});

		return result;
	}

	//This function is used to activate 2FA for a user and to save corresponding changes in the database.
	private async enable2FAForUser(user: User): Promise<void> {
		user.twoFactorAuthenticationSecret = user.unconfirmedTwoFactorSecret;
		user.unconfirmedTwoFactorSecret = null;
		user.isTwoFactorAuthenticationEnabled = true;
		user.status = 'online';
		await this.userRepository.save(user);
	}

	async verifyTwoFactorAuthenticationToken(user: User, token: string): Promise<boolean> {
		if (!user) {
			throw new Error('User not found');
		}

		let secret = user.unconfirmedTwoFactorSecret
			? user.unconfirmedTwoFactorSecret
			: user.twoFactorAuthenticationSecret;

		if (!secret) {
			throw new Error('2FA secret not set');
		}

		const isValid = speakeasy.totp.verify({
			secret: secret,
			encoding: 'base32',
			token: token,
		});

		if (isValid && user.unconfirmedTwoFactorSecret) {
			await this.enable2FAForUser(user);
		}
		return isValid;
	}

	async createAccessToken(userId: string): Promise<string> {
		const user = await this.userService.findProfileById(userId);
		if (!user) {
			console.log('User not found');
			return null;
		}
		const payload = {
			name: user.name,
			id: user.id,
			email: user.email,
			require2FA: user.isTwoFactorAuthenticationEnabled,
		};
		const accesToken = this.jwtService.sign(payload);
		return accesToken;
	}

	async setupTwoFactorAuthentication(user: User): Promise<{ qrCodeUrl: string }> {
		if (!user) {
			throw new Error('User not found');
		}
		if (!user.twoFactorAuthenticationSecret) {
			const secret = speakeasy.generateSecret();
			const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
			user.unconfirmedTwoFactorSecret = secret.base32;
			await this.userRepository.save(user);
			return { qrCodeUrl };
		} else if (user.twoFactorAuthenticationSecret) {
			const secret = user.twoFactorAuthenticationSecret;
			const qrCodeUrl = await QRCode.toDataURL(
				speakeasy.otpauthURL({ secret: secret, label: user.name, encoding: 'base32' }),
			);
			return { qrCodeUrl };
		}
	}

	async toggleTwoFactorAuthentication(enable2FA: boolean, user: User): Promise<any> {
		let redirect = enable2FA;
		if (!enable2FA && !user.twoFactorAuthenticationSecret) {
			redirect = true;
		} else if (enable2FA) {
			redirect = false;
			user.isTwoFactorAuthenticationEnabled = false;
			user.twoFactorAuthenticationSecret = null;
			user.unconfirmedTwoFactorSecret = null;
			await this.userRepository.save(user);
		}
		return { newStatus: redirect };
	}
}
