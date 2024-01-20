import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { IntraUser, OAuthTokenResponse } from './interfaces/auth.interfaces';
import { MoreThan, Repository } from 'typeorm';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtPayload } from './guards/jwt.strategy';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/user.entity';
import { UserService } from 'src/user/user.service';
import { v4 as uuidv4 } from 'uuid';
import { NewPasswordDto } from './DTO/NewPassword.Dto';

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

		const tokenResponse = await axios.post<OAuthTokenResponse>(
			'https://api.intra.42.fr/oauth/token',
			{
				client_id: clientId,
				client_secret: clientSecret,
				code,
				grant_type: 'authorization_code',
				redirect_uri: 'http://localhost:8080/auth/callback',
			},
		);

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

	private async createUserOrUpdate(intraUser: IntraUser): Promise<User> {
		const user: User = await this.userRepository.findOne({ where: { intraId: intraUser.id } });

		if (!user) {
			const newUser = this.userRepository.create({
				email: intraUser.email,
				has2FA: false,
				id: uuidv4(),
				intraId: intraUser.id,
				intraImage: intraUser.image?.versions?.medium,
				name: intraUser.login,
				password: this.configService.get<string>('DEFAULT_PASSWORD'),
				status: 'fresh',
			});
			await this.userRepository.save(newUser);
			return newUser;
		}
		if (!user.has2FA) {
			user.has2FA = false;
		}
		await this.userRepository.save(user);
		return user;
	}

	async authenticate(
		code: string,
	): Promise<{ accessToken?: string; require2FA?: boolean; userId?: string }> {
		try {
			const accessToken = await this.getOAuthToken(code);
			const intraUserData = await this.getOAuthUserData(accessToken);
			const user = await this.createUserOrUpdate(intraUserData);

			const jwtToken = await this.createAccessToken(user.id);
			return { accessToken: jwtToken, userId: user.id };
		} catch (error) {
			const responseError = error as { response: { status: number } };
			if (responseError.response?.status === 401)
				throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
			throw new HttpException('Failed authentication', HttpStatus.UNAUTHORIZED);
		}
	}

	private async enable2FAForUser(user: User): Promise<void> {
		user.TFASecret = user.unconfirmed2FASecret;
		user.unconfirmed2FASecret = null;
		user.has2FA = true;
		user.status = 'online';
		await this.userRepository.save(user);
	}

	async verify2FAToken(user: User, token: string): Promise<boolean> {
		if (!user) throw new Error('User not found');

		const secret = user.unconfirmed2FASecret || user.TFASecret;
		if (!secret) throw new Error('2FA secret not set');

		const isValid = speakeasy.totp.verify({
			encoding: 'base32',
			secret: secret,
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
			email: user.email,
			id: user.id,
			name: user.name,
			require2FA: user.has2FA,
		};
		const accesToken = this.jwtService.sign(payload);
		return accesToken;
	}

	async setup2FA(user: User): Promise<{ qrCodeUrl: string }> {
		if (!user) throw new Error('User not found');

		if (!user.TFASecret) {
			const secret = speakeasy.generateSecret();
			const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
			user.unconfirmed2FASecret = secret.base32;
			await this.userRepository.save(user);
			return { qrCodeUrl };
		}
		const secret = user.TFASecret;
		const qrCodeUrl = await QRCode.toDataURL(
			speakeasy.otpauthURL({ encoding: 'base32', label: user.name, secret: secret }),
		);
		return { qrCodeUrl };
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
			select: [
				'email',
				'id',
				'name',
				'resetPasswordExpires',
				'resetPasswordToken',
				'resetPasswordUrl',
			],
			where: { email: email },
		});
		if (!user) throw new Error('User not found');

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
			auth: {
				pass: this.configService.get('APP_PASSWORD'),
				user: this.configService.get('APP_EMAIL'),
			},
			host: this.configService.get('SMTP_HOST'),
			port: 465,
			secure: true,
		});

		const mailOptions = {
			from: `Support ${this.configService.get('APP_EMAIL')}`,
			to: email,
			subject: 'Password Reset',
			text: `Hello,

			We received a request to reset your password. If you did not make this request, please
			ignore this email. Otherwise, you can reset your password by using the link below:

			${resetPasswordUrl}

			Please note: After resetting your password, you will also need to reconfigure your two-factor authentication (2FA) settings.

			This link will expire in 20min. If you need any further assistance, feel free to reach out
			to our support team.

			Best regards,
			Transcendence-Crew`,
			html: `<p>Hello,</p>
			<p>We received a request to reset your password. If you did not make this request, please
			ignore this email. Otherwise, you can reset your password by clicking on the link below:</p
			<br/>
			<p><a href="${resetPasswordUrl}">Reset Your Password</a></p>
			<br/>
			<p>Please note: After resetting your password, you will also need to reconfigure your two-factor authentication (2FA) settings.</p>
			<br/>
			<p>This link will expire in 20min. If you need any further assistance, feel free to reach out
			to our support team.</p>
			<br/>
			<p>Best regards,<br/>Transcendence-Crew</p>`,
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				console.log('Error sending email: ', error);
				throw new Error('Error sending email');
			}
			console.log('Email sent: ', info.messageId);
		});
	}

	async updatePassword(password: NewPasswordDto): Promise<{ message: string }> {
		const user = await this.userRepository.findOne({
			where: {
				resetPasswordExpires: MoreThan(new Date()),
				resetPasswordToken: password.token,
			},
		});
		if (!user) throw new Error('Invalid or expired password reset token');
		if (password.newPassword !== password.confirmPassword)
			throw new Error('Passwords do not match');
		user.password = await bcrypt.hash(password.newPassword, 10);
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
				resetPasswordExpires: MoreThan(new Date()),
				resetPasswordToken: token,
			},
		});
		return !!user;
	}
}
