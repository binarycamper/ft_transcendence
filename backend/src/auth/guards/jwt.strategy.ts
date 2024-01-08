import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../user/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Request as ExpressRequest } from 'express';

export type JwtPayload = {
	id: string;
	intraId: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor(
		private readonly configService: ConfigService,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(request: ExpressRequest) => {
					let jwt = null;
					if (request && request.headers && request.headers.cookie) {
						const cookies = request.headers.cookie.split(';');
						const tokenCookie = cookies.find((cookie) => cookie.trim().startsWith('token='));
						if (tokenCookie) {
							jwt = tokenCookie.split('=')[1];
							//print token if u need for postman
							// console.log(`Extracted JWT Token: ${jwt}`);
						}
					}
					return jwt;
				},
			]),
			secretOrKey: configService.get<string>('JWT_SECRET'),
		});
	}

	async validate(payload: JwtPayload) {
		const user = await this.userRepository.findOne({
			where: { id: payload.id },
		});

		if (!user) {
			throw new UnauthorizedException('Please sign in to continue');
		}

		return user; // This will be available in your route handlers as `req.user`
	}
}
