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
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Adjust the path based on your directory structure
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

	@Get('/status')
	@UseGuards(JwtAuthGuard) // Ensure this endpoint is protected with JWT Guard
	async checkAuthStatus(@Req() req) {
		// If the request reaches here, it means the user is authenticated
		return { isAuthenticated: true };
	}

	@Get('login')
	async login(@Res() res: Response) {
		const clientId = this.configService.get<string>('INTRA_UID');
		const url = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=http://localhost:8080/auth/callback&response_type=code`;
		console.log(url);
		return res.json({ url });
	}

	@UseGuards(JwtAuthGuard) // Add this line to guard the endpoint
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
				// Setzen des Tokens im Cookie
				res.cookie('token', result.access_token, {
					httpOnly: true,
					maxAge: 86400000 * 7, // 7 days expiry
					sameSite: 'none',
					secure: true, // Set to true if using HTTPS
				});

				// Weiterleitung zum Frontend mit zusätzlichen Informationen
				const redirectUrl = new URL('http://localhost:5173/signup');
				redirectUrl.searchParams.append('userId', result.userId);
				redirectUrl.searchParams.append('require2FA', result.require2FA ? 'true' : 'false');

				res.redirect(redirectUrl.toString());
			} catch (error) {
				throw error;
			}
		}
	}

	// @Get('callback')
	// async handleCallback(
	// 	@Query('code') code: string,
	// 	@Res() res: Response,
	// ): Promise<void> {
	// 	if (code === undefined) {
	// 		throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
	// 	} else
	// 		try {
	// 			//console.log('code: ', code);
	// 			const token = await this.authService.authenticate(code);
	// 			//console.log('Header = ', res.header);
	// 			res.cookie('token', token.access_token, {
	// 				httpOnly: true,
	// 				maxAge: 86400000 * 7, // 7 days expiry
	// 				sameSite: 'none',
	// 				secure: true, // Set to true if using HTTPS
	// 			});
	// 			res.redirect('http://localhost:5173/signup');
	// 		} catch (error) {
	// 			throw error;
	// 		}
	// }

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
			secure: true, // Set to true if using HTTPS
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
		console.log('userId: ', verifyDto.userId);
		console.log('token: ', verifyDto.token);
		const userId = req.user?.id;
		const isValid = await this.authService.verifyTwoFactorAuthenticationToken(
			verifyDto.token,
			req.user,
		);

		if (!isValid) {
			throw new UnauthorizedException('Invalid 2FA token');
		}

		await this.confirmTwoFactorAuthentication(verifyDto.userId);

		// Erstellen des Zugriffstokens nach erfolgreicher 2FA-Überprüfung
		const accessToken = this.authService.createAccessToken(verifyDto.userId);
		return response.status(HttpStatus.OK).json({ accessToken });
	}

	@UseGuards(JwtAuthGuard)
	@Get('/2fa/setup')
	async setupTwoFactorAuthentication(@Req() req) {
		// Sicherstellen, dass req.user definiert ist
		if (!req.user) {
			throw new Error('User not found');
		}

		// Generieren des QR-Codes für 2FA
		const { qrCodeUrl } = await this.authService.setupTwoFactorAuthentication(req.user);
		return { qrCodeUrl };
	}

	@UseGuards(JwtAuthGuard)
	@Post('/2fa/confirm')
	async confirmTwoFactorAuthentication(@Req() req) {
		await this.authService.confirmTwoFactorAuthentication(req.user);
		return { message: '2FA setup confirmed successfully' };
	}
}
