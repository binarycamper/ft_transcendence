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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCallbackDto } from './auth.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Adjust the path based on your directory structure
import { UserController } from 'src/user/user.controller';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
	) {}

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

	/*@Get('callback')
	async getcall(@Body() authCallbackDto: AuthCallbackDto, @Res() res: Response): Promise<void> {
		console.log("TEST");
		const { accessToken, refreshToken } = await this.authService.authenticate(authCallbackDto.code);
		res.cookie('RefreshToken', refreshToken, { httpOnly: true, maxAge: 86400000 * 7, sameSite: 'lax', secure: false }); // 7 days expiry

		res.status(200).send({ accessToken: accessToken, message: 'Logged in successfully' });
	}*/

	@Get('callback')
	async handleCallback(
		@Query('code') code: string,
		@Res() res: Response,
	): Promise<void> {
		if (code === undefined)
			throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
		try {
			const token = await this.authService.authenticate(code);
			//console.log('Header = ', res.header);
			res.cookie('token', token.access_token, { httpOnly: true, secure: true });
			res.redirect('http://localhost:5173/complete-profile'); //redirect always sends 302 (FOUND)
		} catch (error) {
			throw error;
		}

		/* Old Code
			// Exchange the code for an access token and refresh token
			const { accessToken, refreshToken } = await this.authService.authenticate(
				code,
			);

			// Set the refresh token in an HTTP-only cookie
			res.cookie('RefreshToken', refreshToken, {
				httpOnly: true,
				maxAge: 86400000 * 7, // 7 days expiry
				sameSite: 'lax',
				secure: false, // Set to true if using HTTPS
			});

			// Respond with the access token and a success message
			res
				.status(200)
				.json({ accessToken: accessToken, message: 'Logged in successfully' });
		} catch (error) {
			// Log and handle errors appropriately
			console.error('Error in handleCallback:', error);
			res
				.status(500)
				.json({ message: 'Authentication failed', error: error.message });
		}*/
	}

	/*@Post('callback')
	async authenticate(@Body() authCallbackDto: AuthCallbackDto, @Res() res: Response): Promise<void> {
		const { accessToken, refreshToken } = await this.authService.authenticate(authCallbackDto.code);

		res.cookie('RefreshToken', refreshToken, { httpOnly: true, maxAge: 86400000 * 7, sameSite: 'lax', secure: false }); // 7 days expiry

		res.status(200).send({ accessToken: accessToken, message: 'Logged in successfully' });
	}*/

	/*@Get('check-auth')
	async checkAuth(@Req() req, @Res() res) {
		const isAuthenticated = await this.authService.checkAuthentication(req);
		if (isAuthenticated) {
		return res.status(200).send({ isAuthenticated: true });
		} else {
			console.log('Not authenticated');
		return res.status(401).send({ isAuthenticated: false });
		}
	}*/

	@Post('logout')
	async logout(@Req() req, @Res() res: Response) {
		// Clear the session or JWT token. This is just a basic example.
		res.clearCookie('Newsession');
		return res.status(200).send({ message: 'Logged out successfully' });
	}
}
