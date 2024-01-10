import * as bcrypt from 'bcryptjs';
import {
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
import { InjectRepository } from '@nestjs/typeorm';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './DTO/Login.Dto';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { Verify2FADto } from './DTO/verify2FA.Dto';

const COOKIE_MAX_AGE = 7 * 86_400_000; /* 7 days */

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
		private userService: UserService,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {}

	@Get('status')
	@UseGuards(JwtAuthGuard)
	checkAuthStatus() {
		return { isAuthenticated: true };
	}

	@Get('signup')
	signup(@Res() res: Response) {
		const clientId = this.configService.get<string>('INTRA_UID');
		const url = `https://api.intra.42.fr/oauth/authorize?clientId=${clientId}&redirectURI=http://localhost:8080/auth/callback&responseType=code`;
		return res.json({ url });
	}

	@Post('login')
	async login(@Body() loginDto: LoginDto, @Res() res: Response) {
		const { email, password } = loginDto;
		const response = await this.userService.findUserIdForLogin(email);
		const userId = response.id;
		console.log('userId= ', userId);
		if (!userId) throw new UnauthorizedException('Invalid email.');

		const user = await this.userService.findUserCreditsById(userId);
		if (!user) return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid credentials' });

		if (!user.password || !(await bcrypt.compare(password, user.password)))
			throw new UnauthorizedException('Invalid password.');

		//If TwoAuth is enable then skip login and response ok, Fronent creates Qr Code Site
		if (user.has2FA) {
			user.status = 'fresh';
			await this.userRepository.save(user);
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

		const jwtToken = await this.authService.createAccessToken(user.id);
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

		const redirectUrl = new URL('http://localhost:5173/completeprofile');
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
		const userId: string = req.user.id;
		const user = await this.userService.findProfileById(userId);
		if (!user) throw new UnauthorizedException('User not found');

		const isValid = await this.authService.verify2FAToken(user, verifyDto.token);
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
		await this.userRepository.save(user);
		return response.status(HttpStatus.OK).json({ accessToken: jwtToken, userId: user.id });
	}

	@Get('2fa/setup')
	@UseGuards(JwtAuthGuard)
	async setup2FA(@Req() req: Request): Promise<{ qrCodeUrl: string }> {
		const userId: string = req.user.id;

		const user = await this.userService.findProfileById(userId);
		if (!user) throw new Error('User not found');

		const { qrCodeUrl } = await this.authService.setup2FA(user);
		return { qrCodeUrl };
	}

	@Post('toggle-2fa')
	@UseGuards(JwtAuthGuard)
	async toggle2FA(@Req() req: Request, @Res() res: Response, @Body() body: { has2FA: boolean }) {
		try {
			const user = await this.userRepository.findOne({ where: { id: req.user.id } });
			const response = await this.authService.toggle2FA(body.has2FA, user);

			return res.status(HttpStatus.OK).json({ has2FA: response.newStatus });
		} catch (error) {
			if (error instanceof HttpException)
				return res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ message: 'An unexpected error has occurred' });
		}
	}

	//dto rk
	@Post('reset-password')
	async resetPassword(@Body() body: { email: string }, @Res() res: Response) {
		try {
			const response = await this.authService.resetPassword(body.email);

			return res.status(HttpStatus.OK).json({ message: response.message });
		} catch (error) {
			if (error instanceof HttpException)
				return res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ message: 'An unexpected error has occurred' });
		}
	}

	//dto rk
	@Post('update-password')
	async updatePassword(@Body() body: { token: string; password: string }, @Res() res: Response) {
		try {
			const response = await this.authService.updatePassword(body.token, body.password);

			return res.status(HttpStatus.OK).json({ message: response.message });
		} catch (error) {
			if (error instanceof HttpException)
				return res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ message: 'An unexpected error has occurred' });
		}
	}

	//dto rk
	@Get('verify-reset-token/:token')
	async verifyResetToken(@Param('token') token: string, @Res() res: Response) {
		const isValid = await this.authService.verifyResetToken(token);
		if (!isValid)
			return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid or expired token' });
		return res.status(HttpStatus.OK).json({ message: 'Valid token' });
	}
}
