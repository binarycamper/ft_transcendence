// src/auth/auth.controller.ts

import {
	Controller,
	Post,
	Body,
	Get,
	Res,
	Req,
	Param,
	UseGuards,
	Query,
	HttpException,
	HttpStatus,
	UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
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

	@Get('status')
	@UseGuards(JwtAuthGuard)
	checkAuthStatus() {
		return { isAuthenticated: true };
	}

	@Get('signup')
	signup(@Res() res: Response) {
		const clientId = this.configService.get<string>('INTRA_UID');
		const url = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=http://localhost:8080/auth/callback&response_type=code`;
		return res.json({ url });
	}

	@Post('login')
	async login(@Body() loginDto: LoginDto, @Res() res: Response) {
		const { email, password } = loginDto;
		const response = await this.userService.findUserIdForLogin(email);
		const userId = response.id;
		console.log('userId= ', userId);
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
		if (user.has2FA) {
			user.status = 'fresh';
			await this.userRepository.save(user);
			const jwtToken = await this.authService.createAccessToken(user.id);
			if (!jwtToken) {
				throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
			}
			res.clearCookie('token');
			res.cookie('token', jwtToken, {
				httpOnly: true,
				maxAge: 86_400_000 * 7,
				secure: process.env.NODE_ENV !== 'development',
				sameSite: 'lax',
			});
			return res.status(HttpStatus.OK).json({
				message: '2FA required',
				require2FA: true,
				userId: user.id,
				accessToken: jwtToken,
			});
		}

		const jwtToken = await this.authService.createAccessToken(user.id);
		if (!jwtToken) {
			throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
		}

		res.clearCookie('token');
		res.cookie('token', jwtToken, {
			httpOnly: true,
			maxAge: 86_400_000 * 7,
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
					maxAge: 86_400_000 * 7,
					sameSite: 'none', //TODO: overwork cookie sameSite errors --> clientside
					secure: true,
				});

				const redirectUrl = new URL('http://localhost:5173/completeprofile');
				redirectUrl.searchParams.append('require2FA', String(result.require2FA));
				redirectUrl.searchParams.append('token', result.access_token);
				redirectUrl.searchParams.append('userId', result.userId);

				res.redirect(redirectUrl.toString());
			} catch (error) {
				throw error;
			}
		}
	}

	@Post('logout')
	@UseGuards(JwtAuthGuard)
	logout(@Res() res: Response) {
		// TODO: overhaul cookie sameSite errors --> clientside
		res.clearCookie('token', { sameSite: 'none', secure: true });
		return res.status(200).send({ message: 'Logged out successfully' });
	}

	@Post('2fa/verify-2fa')
	@UseGuards(JwtAuthGuard)
	async verify2FA(@Req() req: Request, @Body() verifyDto: Verify2FADto, @Res() response: Response) {
		const userId = req.user.id;
		const user = await this.userService.findProfileById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}
		const token = verifyDto.token;
		const isValid = await this.authService.verify2FAToken(user, token);

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
				maxAge: 86_400_000 * 7,
				secure: process.env.NODE_ENV !== 'development',
				sameSite: 'lax',
			});
			user.status = 'online';
			await this.userRepository.save(user);
			return response.status(HttpStatus.OK).json({ accessToken: jwtToken, userId: user.id });
		}
	}

	@Get('2fa/setup')
	@UseGuards(JwtAuthGuard)
	async setup2FA(@Req() req: Request): Promise<{ qrCodeUrl: string }> {
		const userId = req.user.id;

		const user = await this.userService.findProfileById(userId);
		if (!user) {
			throw new Error('User not found');
		}
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
			return res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
		}
	}

	@Post('reset-password')
	async resetPassword(@Body() body: { email: string }, @Res() res: Response) {
		try {
			console.log('body.email= ', body.email);
			const response = await this.authService.resetPassword(body.email);
			return res.status(HttpStatus.OK).json({ message: response.message });
		} catch (error) {
			return res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
		}
	}

	@Post('update-password')
	async updatePassword(@Body() body: { token: string; password: string }, @Res() res: Response) {
		try {
			const response = await this.authService.updatePassword(body.token, body.password);
			return res.status(HttpStatus.OK).json({ message: response.message });
		} catch (error) {
			return res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
		}
	}

	@Get('verify-reset-token/:token')
	async verifyResetToken(@Param('token') token: string, @Res() res: Response) {
		const isValid = await this.authService.verifyResetToken(token);
		if (!isValid) {
			return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid or expired token' });
		}
		return res.status(HttpStatus.OK).json({ message: 'Valid token' });
	}
}
