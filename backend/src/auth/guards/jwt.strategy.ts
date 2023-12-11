import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../user/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Request as ExpressRequest } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private readonly configService: ConfigService,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(request: ExpressRequest | any) => {
					let jwt = null;
					if (request && request.headers && request.headers.cookie) {
						const cookies = request.headers.cookie.split(';');
						const tokenCookie = cookies.find((cookie) => cookie.trim().startsWith('token='));
						if (tokenCookie) {
							jwt = tokenCookie.split('=')[1];
							//print token if u need for postman
							//console.log(`Extracted JWT Token: ${jwt}`);
						}
					}
					return jwt;
				},
			]),
			secretOrKey: process.env.JWT_SECRET,
		});
	}

	async validate(payload: any) {
		const user = await this.userRepository.findOne({
			where: { id: payload.id },
		});
		if (!user) {
			throw new UnauthorizedException();
		}
		return user; // This will be available in your route handlers as `req.user`
	}
}
