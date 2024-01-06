// src/auth/auth.controller.ts

import {
	Controller,
	Post,
	Body,
	Get,
	Res,
	Req,
	UseGuards,
	Query,
	HttpException,
	HttpStatus,
	UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserService } from '../user/user.service';
import { Verify2FADto } from './DTO/verify2FA.Dto';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './DTO/Login.Dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
		private userService: UserService,
		private jwtService: JwtService,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {}

	@UseGuards(JwtAuthGuard)
	@Get('status')
	async checkAuthStatus() {
		return { isAuthenticated: true };
	}

	@Get('signup')
	async signup(@Res() res: Response) {
		const clientId = this.configService.get<string>('INTRA_UID');
		const url = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=http://localhost:8080/auth/callback&response_type=code`;
		return res.json({ url });
	}

	@Post('login')
	async login(@Body() loginDto: LoginDto, @Res() res: Response) {
		const { email, password } = loginDto;
		const userId = await this.userService.findUserIdByMail(email);

		if (!userId) {
			throw new UnauthorizedException('Invalid email.');
		}
		const user = await this.userService.findUserCreditsById(userId);
		if (!user) {
			return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid credentials' });
		}

		if (!user.password || !(await bcrypt.compare(password, user.password))) {
			throw new UnauthorizedException('Invalid password.');
		}

		//If TwoAuth is enable then skip login and response ok, Fronent creates Qr Code Site
		if (user.isTwoFactorAuthenticationEnabled) {
			return res.status(HttpStatus.OK).json({
				message: '2FA required',
				require2FA: true,
				userId: user.id,
			});
		}

		const jwtToken = await this.authService.createAccessToken(user.id);
		if (!jwtToken) {
			throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
		}

		res.clearCookie('token');
		res.cookie('token', jwtToken, {
			httpOnly: true,
			maxAge: 86400000 * 7,
			secure: process.env.NODE_ENV !== 'development',
			sameSite: 'lax',
		});
		return res
			.status(200)
			.json({ message: 'Login successfully', accessToken: jwtToken, userId: user.id });
	}

	@Get('callback')
	async handleCallback(@Query('code') code: string, @Res() res: Response): Promise<void> {
		if (code === undefined) {
			throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
		} else {
			try {
				const result = await this.authService.authenticate(code);
				res.cookie('token', result.access_token, {
					httpOnly: true,
					maxAge: 86400000 * 7,
					sameSite: 'none', //TODO: overwork cookie sameSite errors --> clientside
					secure: true,
				});

				const redirectUrl = new URL('http://localhost:5173/completeprofile');
				redirectUrl.searchParams.append('require2FA', result.require2FA ? 'true' : 'false');
				redirectUrl.searchParams.append('token', result.access_token);
				redirectUrl.searchParams.append('userId', result.userId);

				res.redirect(redirectUrl.toString());
			} catch (error) {
				throw error;
			}
		}
	}

	@UseGuards(JwtAuthGuard)
	@Post('logout')
	async logout(@Res() res: Response) {
		res.clearCookie('token', {
			sameSite: 'none', //TODO: overwork cookie sameSite errors --> clientside
			secure: true,
		});
		return res.status(200).send({ message: 'Logged out successfully' });
	}

	@Post('/2fa/verify-2fa')
	async verifyTwoFactorAuthentication(@Body() verifyDto: Verify2FADto, @Res() response: Response) {
		const userId = verifyDto.userId;
		const user = await this.userService.findProfileById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}
		const token = verifyDto.token;
		const isValid = await this.authService.verifyTwoFactorAuthenticationToken(user, token);

		if (!isValid) {
			return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid 2FA token' });
		} else {
			const jwtToken = await this.authService.createAccessToken(user.id);
			if (!jwtToken) {
				throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
			}
			response.clearCookie('token');
			response.cookie('token', jwtToken, {
				httpOnly: true,
				maxAge: 86400000 * 7,
				secure: process.env.NODE_ENV !== 'development',
				sameSite: 'lax',
			});
			return response.status(HttpStatus.OK).json({ accessToken: jwtToken, userId: user.id });
		}
	}

	@Get('/2fa/setup')
	async setupTwoFactorAuthentication(@Query('userId') userId: string) {
		const user = await this.userService.findProfileById(userId);
		if (!user) {
			throw new Error('User not found');
		}
		const { qrCodeUrl } = await this.authService.setupTwoFactorAuthentication(user);
		return { qrCodeUrl };
	}

	@UseGuards(JwtAuthGuard)
	@Post('/toggle-2fa')
	async toggleTwoFactorAuthentication(
		@Req() req: any,
		@Res() res: Response,
		@Query('enable2FA') enable2FA: boolean,
	): Promise<any> {
		const response = await this.authService.toggleTwoFactorAuthentication(enable2FA, req.user); // req.user enthält die Benutzerinformationen (vorausgesetzt, Sie verwenden Passport oder eine ähnliche Authentifizierungsbibliothek)
		const user = await this.userRepository.findOne({ where: { id: req.user.id } });
		if (user.unconfirmedTwoFactorSecret === null && enable2FA === true) {
			return res.status(HttpStatus.SEE_OTHER).json(response);
		}
		return res.status(HttpStatus.OK).json(response);
	}
}
