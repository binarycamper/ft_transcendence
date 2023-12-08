// src/auth/auth.controller.ts

import {
	Controller,
	Post,
	Body,
	Get,
	Res,
	Req,
	UseGuards,
	Injectable,
	Query,
	HttpException,
	HttpStatus,
	UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCallbackDto } from './auth.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import * as fs from 'fs';
import * as sharp from 'sharp';
import { UserService } from '../user/user.service';
import { Verify2FADto } from './DTO/verify2FA.Dto';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
		private userService: UserService,
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

	@UseGuards(JwtAuthGuard)
	@Post('refresh-token')
	async refreshToken(@Req() req, @Res() res: Response) {
		const result = await this.authService.refreshToken(req);
		if (result.accessToken) {
			return res.status(200).send({ accessToken: result.accessToken });
		} else {
			return res.status(401).send({ message: result.message });
		}
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

				const redirectUrl = new URL('http://localhost:5173/signup');
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
		const userId = req.user.id; // Assuming req.user is populated with the user's information
		// Find the user by ID
		const user = await this.userService.findProfileById(userId);
		if (user) {
			// Update the user's status to 'offline'
			user.status = 'offline';
			await this.userService.updateUser(user);
		}
		// Clear the cookie
		res.clearCookie('token', {
			sameSite: 'none',
			secure: true,
		});
		// Send the response
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
			await this.authService.confirmTwoFactorAuthentication(user);
			const accessToken = this.authService.createAccessToken(user.id);
			return response.status(HttpStatus.OK).json({ accessToken });
		}
	}

	@UseGuards(JwtAuthGuard)
	@Get('/2fa/setup')
	async setupTwoFactorAuthentication(@Req() req) {
		const request = req;
		if (!request) {
			throw new Error('User not found');
		}

		const { qrCodeUrl } = await this.authService.setupTwoFactorAuthentication(request.user);
		return { qrCodeUrl };
	}

	@UseGuards(JwtAuthGuard)
	@Post('/2fa/confirm')
	async confirmTwoFactorAuthentication(@Req() req, @Res() response: Response) {
		const user = req.user;
		if (!user) {
			return response.status(HttpStatus.BAD_REQUEST).json({ message: '2FA cannot be confirmed' });
		}

		await this.authService.confirmTwoFactorAuthentication(user);
		return response.status(HttpStatus.OK).json({ message: '2FA confirmed successfully' });
	}
}
