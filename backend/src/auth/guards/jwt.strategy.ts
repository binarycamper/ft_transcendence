import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../user/user.entity'; // Adjust the path if needed
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
	private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(User) // This decorator tells NestJS to inject the User repository
    private readonly userRepository: Repository<User>, // This is the correct type
  ) {
	// console.log('JWT Secret:', configService.get<string>('JWT_SECRET'));
	// console.log(process.env.JWT_SECRET);
    super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: configService.get<string>('JWT_SECRET'), // Use your secret key or better yet, get it from a config service
    });
  }

  async validate(payload: any) {
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user; // This will be available in your route handlers as `req.user`
  }
}
