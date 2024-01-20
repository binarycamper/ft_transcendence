import * as bcrypt from 'bcryptjs';
import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Post,
	Query,
	Req,
	Res,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './DTO/Login.Dto';
import { UserService } from '../user/user.service';
import { Verify2FADto, VerifyResetTokenDto } from './DTO/verify2FA.Dto';
import { NewPasswordDto, SendResetPasswordEmailDto } from './DTO/NewPassword.Dto';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import { User } from 'src/user/user.entity';

const COOKIE_MAX_AGE = 7 * 86_400_000; /* 7 days */

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
		private userService: UserService,
	) {}

	@Get('status')
	@UseGuards(JwtAuthGuard)
	checkAuthStatus() {
		return { isAuthenticated: true };
	}

	@Get('signup')
	signup(@Res() res: Response) {
		const clientId = this.configService.get<string>('INTRA_UID');
		const url = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${process.env.INTRA_REDIRECT_URI}&response_type=code`;
		return res.json({ url });
	}

	@Post('login')
	async login(@Body() loginDto: LoginDto, @Res() res: Response) {
		const { email, password } = loginDto;
		const response: User = await this.userService.findUserIdForLogin(email); //User has only id inside!
		if (!response) throw new UnauthorizedException('Invalid email.');
		const user: User = await this.userService.findUserCreditsById(response.id); //User has id & credentials inside!
		if (!user) return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid credentials' });

		if (!user.password || !(await bcrypt.compare(password, user.password)))
			throw new UnauthorizedException('Invalid password.');

		//If TwoAuth is enable then skip login and response ok, Fronent creates Qr Code Site
		if (user.has2FA) {
			user.status = 'fresh';
			await this.userService.updateUser(user);
			const jwtToken = await this.authService.createAccessToken(user.id);
			if (!jwtToken) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

			res.clearCookie('token');
			res.cookie('token', jwtToken, {
				httpOnly: true,
				maxAge: COOKIE_MAX_AGE,
				sameSite: 'lax',
				secure: this.configService.get('NODE_ENV') !== 'development',
			});
			return res.status(HttpStatus.OK).json({
				accessToken: jwtToken,
				message: '2FA required',
				require2FA: true,
				userId: user.id,
			});
		}

		const jwtToken: string = await this.authService.createAccessToken(user.id);
		if (!jwtToken) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

		res.clearCookie('token');
		res.cookie('token', jwtToken, {
			httpOnly: true,
			maxAge: COOKIE_MAX_AGE,
			sameSite: 'lax',
			secure: this.configService.get('NODE_ENV') !== 'development',
		});
		return res.status(200).json({
			accessToken: jwtToken,
			message: 'Login successfully',
			userId: user.id,
		});
	}

	@Get('callback')
	async handleCallback(@Query('code') code: string, @Res() res: Response): Promise<void> {
		if (code === undefined) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

		const result = await this.authService.authenticate(code);
		res.cookie('token', result.accessToken, {
			httpOnly: true,
			maxAge: COOKIE_MAX_AGE,
			sameSite: 'none', // TODO: overhaul cookie same-site errors --> client-side
			secure: true,
		});

		const redirectUrl: URL = new URL('http://localhost:5173/completeprofile');
		redirectUrl.searchParams.append('require2FA', String(result.require2FA));
		redirectUrl.searchParams.append('token', result.accessToken);
		redirectUrl.searchParams.append('userId', result.userId);

		res.redirect(redirectUrl.toString());
	}

	@Post('logout')
	@UseGuards(JwtAuthGuard)
	logout(@Res() res: Response) {
		// TODO: overhaul cookie same-site errors --> client-side
		res.clearCookie('token', { sameSite: 'none', secure: true });
		return res.status(200).send({ message: 'Logged out successfully' });
	}

	@Post('2fa/verify-2fa')
	@UseGuards(JwtAuthGuard)
	async verify2FA(@Req() req: Request, @Body() verifyDto: Verify2FADto, @Res() response: Response) {
		const user: User = await this.userService.findProfileById(req.user.id);
		if (!user) throw new UnauthorizedException('User not found');

		const isValid: boolean = await this.authService.verify2FAToken(user, verifyDto.token);
		if (!isValid)
			return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid 2FA token' });

		const jwtToken = await this.authService.createAccessToken(user.id);
		if (!jwtToken) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

		response.clearCookie('token');
		response.cookie('token', jwtToken, {
			httpOnly: true,
			maxAge: COOKIE_MAX_AGE,
			sameSite: 'lax',
			secure: process.env.NODE_ENV !== 'development',
		});
		user.status = 'online';
		await this.userService.updateUser(user);
		return response.status(HttpStatus.OK).json({ accessToken: jwtToken, userId: user.id });
	}

	@Get('2fa/setup')
	@UseGuards(JwtAuthGuard)
	async setup2FA(@Req() req: Request): Promise<{ qrCodeUrl: string }> {
		const user: User = await this.userService.findProfileById(req.user.id);
		if (user.TFASecret) {
			return { qrCodeUrl: null };
		}

		if (!user) throw new Error('User not found');

		const { qrCodeUrl } = await this.authService.setup2FA(user);
		return { qrCodeUrl };
	}

	@Post('toggle-2fa')
	@UseGuards(JwtAuthGuard)
	async toggle2FA(@Req() req: Request, @Res() res: Response, @Body() body: { has2FA: boolean }) {
		try {
			const user: User = await this.userService.findProfileById(req.user.id);
			const response = await this.authService.toggle2FA(body.has2FA, user);
			return res.status(HttpStatus.OK).json({ has2FA: response.newStatus });
		} catch (error) {
			if (error instanceof HttpException)
				return res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
			return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invald request' });
		}
	}

	@Post('reset-password')
	async resetPassword(@Body() email: SendResetPasswordEmailDto, @Res() res: Response) {
		try {
			const response = await this.authService.resetPassword(email.email);

			return res.status(HttpStatus.OK).json({ message: response.message });
		} catch (error) {
			if (error instanceof HttpException)
				return res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
			return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invald request' });
		}
	}

	@Post('update-password')
	async updatePassword(
		@Body()
		newPasswordDto: NewPasswordDto,
		@Res() res: Response,
	) {
		try {
			const options = {
				translations: zxcvbnEnPackage.translations,
				graphs: zxcvbnCommonPackage.adjacencyGraphs,
				dictionary: {
					...zxcvbnCommonPackage.dictionary,
					...zxcvbnEnPackage.dictionary,
				},
			};
			zxcvbnOptions.setOptions(options);
			const result = zxcvbn(newPasswordDto.newPassword);
			if (result.feedback.warning) {
				throw new BadRequestException('Insecure Password');
			}
			const result2 = zxcvbn(newPasswordDto.confirmPassword);
			if (result2.feedback.warning) {
				throw new BadRequestException('Insecure Password');
			}
			if (newPasswordDto.newPassword !== newPasswordDto.confirmPassword) {
				throw new BadRequestException('Passwords do not match');
			}
			const response = await this.authService.updatePassword(newPasswordDto);

			return res.status(HttpStatus.OK).json({ message: response.message });
		} catch (error) {
			if (error instanceof HttpException)
				return res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
			return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invald request' });
		}
	}

	//dto rk
	@Get('verify-reset-token/:token')
	async verifyResetToken(@Param() verifyResetTokenDto: VerifyResetTokenDto, @Res() res: Response) {
		const isValid = await this.authService.verifyResetToken(verifyResetTokenDto.token);
		if (!isValid)
			return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid or expired token' });
		return res.status(HttpStatus.OK).json({ message: 'Valid token' });
	}
}
