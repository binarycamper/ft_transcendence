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
import * as nodemailer from 'nodemailer';
import * as bcrypt from 'bcryptjs';
import { MoreThan } from 'typeorm';
import { JwtPayload } from './guards/jwt.strategy';

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

	/* This method is used to obtain the OAuth token from 42's API. */
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

	/* This method retrieves user data from 42's API. */
	private async getOAuthUserData(accessToken: string): Promise<IntraUser> {
		const response: { data: IntraUser } = await this.httpService
			.get('https://api.intra.42.fr/v2/me', {
				headers: { Authorization: `Bearer ${accessToken}` },
			})
			.toPromise();

		return response.data;
	}

	/* This method creates a new user or updates it if it already exists. */
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

	private async createUserOrUpdate(intraUser: IntraUser): Promise<User> {
		const user: User = await this.userRepository.findOne({ where: { intraId: intraUser.id } });

		if (!user) {
			const newUser = this.userRepository.create({
				id: uuidv4(),
				name: intraUser.login,
				email: intraUser.email,
				password: 'hashed-pw',
				status: 'fresh',
				intraId: intraUser.id,
				intraImage: intraUser.image?.versions?.medium,
				has2FA: false,
			});
			await this.userRepository.save(newUser);
			return newUser;
		}
		// Benutzer existiert bereits, update nur sichere Felder
		// Kein Überschreiben von isTwoFactorAuthenticationEnabled, wenn es bereits aktiviert ist
		// TODO if user already exists
		if (!user.has2FA) {
			user.has2FA = false;
		}
		await this.userRepository.save(user);
		return user;
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

	/* This method is used to validate the refresh token and retrieve the user from the database. */
	private async validateRefreshToken(refreshToken: string): Promise<User> {
		try {
			const decoded = this.jwtService.verify<JwtPayload>(refreshToken);
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
		return speakeasy.totp.verify({
			secret: user.unconfirmed2FASecret,
			encoding: 'base32',
			token: token,
		});
	}

	/* Enable 2FA for user and save corresponding changes in the database. */
	private async enable2FAForUser(user: User): Promise<void> {
		user.TFASecret = user.unconfirmed2FASecret;
		user.unconfirmed2FASecret = null;
		user.has2FA = true;
		user.status = 'online';
		await this.userRepository.save(user);
	}

	async verify2FAToken(user: User, token: string): Promise<boolean> {
		if (!user) {
			throw new Error('User not found');
		}

		const secret = user.unconfirmed2FASecret || user.TFASecret;

		if (!secret) {
			throw new Error('2FA secret not set');
		}

		const isValid = speakeasy.totp.verify({
			secret: secret,
			encoding: 'base32',
			token: token,
		});

		if (isValid && user.unconfirmed2FASecret) {
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
			require2FA: user.has2FA,
		};
		const accesToken = this.jwtService.sign(payload);
		return accesToken;
	}

	async setup2FA(user: User): Promise<{ qrCodeUrl: string }> {
		if (!user) {
			throw new Error('User not found');
		}
		if (!user.TFASecret) {
			const secret = speakeasy.generateSecret();
			const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
			user.unconfirmed2FASecret = secret.base32;
			await this.userRepository.save(user);
			return { qrCodeUrl };
		} else if (user.TFASecret) {
			const secret = user.TFASecret;
			const qrCodeUrl = await QRCode.toDataURL(
				speakeasy.otpauthURL({ secret: secret, label: user.name, encoding: 'base32' }),
			);
			return { qrCodeUrl };
		}
	}

	async toggle2FA(enable2FA: boolean, user: User): Promise<{ newStatus: boolean }> {
		let redirect = enable2FA;
		if (!enable2FA && !user.TFASecret) {
			redirect = true;
		} else if (enable2FA) {
			redirect = false;
			user.has2FA = false;
			user.TFASecret = null;
			user.unconfirmed2FASecret = null;
			await this.userRepository.save(user);
		}
		return { newStatus: redirect };
	}

	async resetPassword(email: string): Promise<{ message: string }> {
		const user = await this.userRepository.findOne({
			where: { email: email },
			select: [
				'id',
				'name',
				'email',
				'password',
				'resetPasswordToken',
				'resetPasswordExpires',
				'resetPasswordUrl',
			],
		});
		if (!user) {
			throw new Error('User not found');
		}
		console.log('user= ', user);
		const resetToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
		const redirectUrl = `http://localhost:5173/reset-password/${resetToken}`;
		user.resetPasswordToken = resetToken;
		user.resetPasswordExpires = new Date(Date.now() + 1_200_000); /* 20 minutes */
		user.resetPasswordUrl = redirectUrl;
		await this.userRepository.save(user);
		this.sendResetPasswordEmail(email, redirectUrl);
		return { message: 'Password reset token generated' };
	}

	sendResetPasswordEmail(email: string, resetPasswordUrl: string) {
		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 465,
			secure: true,
			auth: {
				user: 'transcendence502@gmail.com',
				pass: this.configService.get<string>('APP_PASSWORD'),
			},
		});

		const mailOptions = {
			from: '"Support" <transcendence502@gmail.com>',
			to: email,
			subject: 'Password Reset',
			text: `Please use the following link to reset your password: ${resetPasswordUrl}`,
			html: `<p>Please use the following link to reset your password: <a href="${resetPasswordUrl}">${resetPasswordUrl}</a></p>`,
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				console.log('Error sending email: ', error);
				throw new Error('Error sending email');
			}
			console.log('Email sent: ', info.messageId);
		});
	}

	async updatePassword(token: string, newPassword: string): Promise<{ message: string }> {
		const user = await this.userRepository.findOne({
			where: {
				resetPasswordToken: token,
				resetPasswordExpires: MoreThan(new Date()),
			},
		});

		if (!user) {
			throw new Error('Invalid or expired password reset token');
		}

		user.password = await bcrypt.hash(newPassword, 10);
		user.resetPasswordToken = null;
		user.resetPasswordExpires = null;
		user.has2FA = false;
		user.TFASecret = null;
		await this.userRepository.save(user);
		return { message: 'Password updated successfully' };
	}

	async verifyResetToken(token: string): Promise<boolean> {
		const user = await this.userRepository.findOne({
			where: {
				resetPasswordToken: token,
				resetPasswordExpires: MoreThan(new Date()),
			},
		});
		return !!user;
	}
}

type IntraUser = {
	email: string;
	id: string;
	image?: {
		versions?: {
			medium?: string;
		};
	};
	login: string;
};
