import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Repository } from 'typeorm';
import { TokenBlacklistService } from './token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService, 
    @InjectRepository(User) private usersRepo: Repository<User>,
    private blacklistService: TokenBlacklistService, // ✅ ADD this
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
      passReqToCallback: true, // ✅ ADD this to access request
    });
  }

  async validate(req: any, payload: any) {
    // ✅ CHECK if token is blacklisted
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    const isBlacklisted = await this.blacklistService.isTokenBlacklisted(token);
    
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been invalidated');
    }

    // attach full user object (without password) to req.user
    const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
    if (!user) return null;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user as any;
    return rest;
  }
}