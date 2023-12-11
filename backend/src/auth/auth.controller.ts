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
	@Get('/status')
	async checkAuthStatus(@Req() req) {
		return { isAuthenticated: true };
	}

	@Get('signup')
	async signup(@Res() res: Response) {
		const clientId = this.configService.get<string>('INTRA_UID');
		const url = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=http://localhost:8080/auth/callback&response_type=code`;
		console.log(url);
		return res.json({ url });
	}

	@Post('login')
	async login(@Body() loginDto: LoginDto, @Req() req: Request, @Res() res: Response) {
		const { email, password } = loginDto;

		const userId = await this.userService.findUserIdByMail(email);
		const user = await this.userService.findProfileById(userId);
		if (!user) {
			return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid credentials' });
		}

		if (!user.password || !(await bcrypt.compare(password, user.password))) {
			return res.status(401).json({ message: 'Wrong password.' });
		}

		const userPayload = {
			name: user.name,
			email: user.email,
			id: user.id,
			intraId: user.intraId,
			password: user.password,
		};
		const jwtToken = this.jwtService.sign(userPayload);

		// Clear old cookie and set new one
		res.clearCookie('token');
		res.cookie('token', jwtToken, {
			httpOnly: true,
			maxAge: 86400000 * 7,
			secure: process.env.NODE_ENV !== 'development',
			sameSite: 'lax',
		});
		return res.status(200).json({ message: 'Login successfully', userId: user.id });
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
				redirectUrl.searchParams.append('/?userId', result.userId);
				redirectUrl.searchParams.append('require2FA', result.require2FA ? 'true' : 'false');
				redirectUrl.searchParams.append('token', result.access_token);
				redirectUrl.searchParams.append('userId', result.userId);
				redirectUrl.searchParams.append('token', result.access_token);
				redirectUrl.searchParams.append('require2FA', result.require2FA ? 'true' : 'false');

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

	@UseGuards(JwtAuthGuard)
	@Post('/2fa/verify-2fa')
	async verifyTwoFactorAuthentication(
		@Body() verifyDto: Verify2FADto,
		@Res() response: Response,
		@Req() req,
	) {
		const user = req.user;
		if (!user) {
			throw new UnauthorizedException('User not found');
		}
		const token = verifyDto.token;
		const isValid = await this.authService.verifyTwoFactorAuthenticationToken(user, token);

		if (!isValid) {
			return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid 2FA token' });
		} else {
			const accessToken = this.authService.createAccessToken(user.id);
			return response.status(HttpStatus.OK).json({ accessToken });
		}
	}

	@UseGuards(JwtAuthGuard)
	@Get('/2fa/setup')
	async setupTwoFactorAuthentication(@Req() req) {
		const request = req;
		if (!request.user) {
			throw new Error('User not found');
		}
		const { qrCodeUrl } = await this.authService.setupTwoFactorAuthentication(request.user);
		return { qrCodeUrl };
	}
}
