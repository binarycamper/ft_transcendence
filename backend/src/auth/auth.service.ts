import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthToken } from './auth.entity';
import { User } from '../user/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import axios from "axios";
import { use } from 'passport';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // Inject the userRepository
    @InjectRepository(AuthToken)
    private readonly authTokenRepository: Repository<AuthToken>, // Inject the authTokenRepository
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async authenticate(code: string): Promise<string> {
    try {
      const clientId = this.configService.get<string>('MY_42_INTRANET_CLIENT_ID');
      const clientSecret = this.configService.get<string>('MY_42_INTRANET_CLIENT_SECRET');
      const redirectUri = this.configService.get<string>('REDIR_URL');

      // Exchange the code for an access token
      const tokenResponse = await axios.post('https://api.intra.42.fr/oauth/token', {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      });

      const accessToken: string = tokenResponse.data.access_token;

      // Fetch user data from 42 API using the accessToken
      const userResponse = await this.httpService
        .get('https://api.intra.42.fr/v2/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        .toPromise();

      const userData = userResponse.data;

      // Check if user exists in your database, if not, create them
      let user = await this.userRepository.findOne({
        where: { intraId: userData.id },
      });

      if (!user) {
        // Generate or obtain a secure password here
        const securePassword = 'generate-or-obtain-password-here'; // Replace this with your logic
        const hashedPassword = await bcrypt.hash(securePassword, 10);

        user = this.userRepository.create({
          intraId: userData.id,
          name: userData.login,
          email: userData.email,
          password: hashedPassword,
        });
        await this.userRepository.save(user);
      }

      // Create and save the auth token
      let authToken = await this.authTokenRepository.findOne({
        where: { user: user },
      });

      if (!authToken) {
        authToken = this.authTokenRepository.create({
          token: accessToken, // Save the plain access token
		  password: user.password,
		  userId: user.id,
		  user: user,
        });
      } else {
        // If token exists, update it
        authToken.token = accessToken;
      }

      await this.authTokenRepository.save(authToken);

      // Generate JWT for the client
      const payload = { username: user.name, sub: user.id };
      const jwtToken = this.jwtService.sign(payload);

      return jwtToken; // Return the JWT to the client
    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 401) {
        throw new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED);
      } else {
        throw new HttpException("Failed authentication", HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
		
		//Old way:
		/*const accessToken = tokenResponse.data.access_token;

		// Fetch user data from 42 API
		const userResponse = await this.httpService
			.get('https://api.intra.42.fr/v2/me', {
				headers: { Authorization: `Bearer ${accessToken}` },
			})
			.toPromise();

		const userData = userResponse.data;

		// Check if user exists in your database, if not, create them
		let user = await this.userRepository.findOne({
			where: { intraId: userData.id },
		});
		if (!user) {
			const hashedPassword = await bcrypt.hash('default', 10);
			user = this.userRepository.create({
				intraId: userData.id,
				name: userData.login,
				email: userData.email,
				password: hashedPassword,
			});
			await this.userRepository.save(user);
		}

		// Save the token in the database associated with the user
		const authToken = new AuthToken();
		authToken.token = accessToken; // the access token from the OAuth provider
		authToken.user = user; // associate the token with the user
		authToken.password = await bcrypt.hash('default', 10);
		await this.authTokenRepository.save(authToken);

		// Create JWTs
		const payload = { username: user.name, sub: user.id };
		const newAccessToken = this.jwtService.sign(payload);
		const newRefreshToken = this.jwtService.sign(payload, { expiresIn: '7d' }); // 7 days expiry

		// Return the JWTs
		return { accessToken: newAccessToken, refreshToken: newRefreshToken };*/
	}

	async generateNewAccessToken(refreshToken: string): Promise<string | null> {
		try {
			// Verify the refresh token
			const decoded = this.jwtService.verify(refreshToken);

			// Check if the user still exists in your DB
			const user = await this.userRepository.findOne({
				where: { id: decoded.sub },
			});
			if (!user) {
				console.log('User not found for the provided refresh token.');
				return null;
			}

			// Create a new JWT payload
			const payload = { username: user.name, sub: user.id };

			// Generate a new access token
			const newAccessToken = this.jwtService.sign(payload);

			return newAccessToken;
		} catch (error) {
			console.log('Invalid refresh token:', error.message);
			return null;
		}
	}

	async refreshToken(req): Promise<{ accessToken?: string; message?: string }> {
		const refreshToken = req.cookies['RefreshToken'];
		const newAccessToken = await this.generateNewAccessToken(refreshToken);
		if (newAccessToken) {
			return { accessToken: newAccessToken };
		} else {
			return { message: 'Invalid refresh token' };
		}
	}
}
