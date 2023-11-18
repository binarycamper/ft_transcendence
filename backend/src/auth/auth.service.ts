// src/auth/auth.service.ts

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthToken } from './auth.entity';
import { User } from '../user/user.entity'
import { ConfigService } from '@nestjs/config'
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class AuthService {
  constructor(
	@InjectRepository(User)
    private readonly userRepository: Repository<User>, // Inject the userRepository
    @InjectRepository(AuthToken)
    private readonly authTokenRepository: Repository<AuthToken>,
    private readonly httpService: HttpService, // Inject Nest's HttpService
	private readonly configService: ConfigService,
	private readonly jwtService: JwtService,
  ) {}

  async authenticate(code: string): Promise<{ accessToken: string, refreshToken: string }> {
    const clientId = this.configService.get<string>('MY_42_INTRANET_CLIENT_ID');
    const clientSecret = this.configService.get<string>('MY_42_INTRANET_CLIENT_SECRET');
	console.log('Client ID:', clientId);
	console.log('Client Secret:', clientSecret);
    const redirectUri = 'http://localhost:8081/auth/callback'; // Adjust this to your setup

    const response = await this.httpService.post('https://api.intra.42.fr/oauth/token', {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
    }).toPromise();

    const token = response.data.access_token;

    // Fetch user data from 42 API
    const userResponse = await this.httpService.get('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${token}` },
	  withCredentials: true,
    }).toPromise();

    const userData = userResponse.data;

    // Check if user exists in your database, if not, create them
    let user = await this.userRepository.findOne({ where: { intraId: userData.id } });
    if (!user) {
		user = new User();
		user.intraId = userData.id;
		user.name = userData.login;
		user.email = userData.email;
		user.password = 'temporaryPassword'; // or some hashed/random value
		// ... any other fields you want to store ...
		await this.userRepository.save(user);
	  }
	  

    // Save the token in the database associated with the user
    const authToken = new AuthToken();
    authToken.token = token;
    authToken.user = user;
    await this.authTokenRepository.save(authToken);

	// Create a JWT payload
    const payload = { username: user.name, sub: user.id };

	const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' }); // 7 days for example

    return { accessToken, refreshToken };
  }

  async checkAuthentication(req): Promise<boolean> {
    const jwtToken = req.cookies ? req.cookies.Newsession : null;

    if (!jwtToken) {
      console.log('No JWT token found in cookies.');
      return false;
    }

    try {
      // Verify the JWT
      const decoded = this.jwtService.verify(jwtToken);
      console.log('Decoded JWT:', decoded);

      // Optionally, you can check if the user still exists in your DB
      const user = await this.userRepository.findOne({ where: { id: decoded.sub } });
      return !!user;
    } catch (error) {
      console.log('Invalid JWT:', error.message);
      return false;
    }
  }

  async generateNewAccessToken(refreshToken: string): Promise<string | null> {
	try {
	  // Verify the refresh token
	  const decoded = this.jwtService.verify(refreshToken);
  
	  // Check if the user still exists in your DB
	  const user = await this.userRepository.findOne({ where: { id: decoded.sub } });
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

  async refreshToken(req): Promise<{ accessToken?: string, message?: string }> {
	const refreshToken = req.cookies['RefreshToken'];
	const newAccessToken = await this.generateNewAccessToken(refreshToken);
	if (newAccessToken) {
	  return { accessToken: newAccessToken };
	} else {
	  return { message: 'Invalid refresh token' };
	}
  }
}
