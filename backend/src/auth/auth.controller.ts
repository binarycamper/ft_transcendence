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
	async login(@Body() loginDto: LoginDto, @Res() res: Response) {
		const { email, password } = loginDto;
		console.log(loginDto);

		const user = await this.userRepository.findOne({
			where: { email },
			select: ['id', 'email', 'password'],
		});
		if (!user) {
			return res.status(401).json({ message: 'Benutzer nicht gefunden.' });
		}

		//console.log('Gefundener Benutzer:', user);
		if (!user.password) {
			console.error('Passwordfield is undefined');
			return res.status(500).json({ message: 'Internal Servererror' });
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(401).json({ message: 'Wrong password.' });
		}

		const userPayload = {
			name: user.name,
			email: user.email,
			password: user.password,
			intraId: user.intraId,
			//imageUrl: user.image?.versions?.medium, TOdoo:
		};
		const jwtToken = this.jwtService.sign(userPayload);
		// Set the cookie with the JWT token
		res.cookie('token', jwtToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV !== 'development',
			sameSite: 'strict',
		});

		// Send back a successful response
		return res.status(200).json({ message: 'Login erfolgreich', userId: user.id });
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
					sameSite: 'none',
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
	async logout(@Req() req, @Res() res: Response) {
		const userId = req.user.id;

		const user = await this.userService.findProfileById(userId);
		if (user) {
			// user.status = 'offline';
			await this.userService.updateUser(user);
		}

		res.clearCookie('token', {
			sameSite: 'none',
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
