// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { UserService } from '../user/user.service';

const ACCESS_COOKIE = 'access_token';

// Reads the JWT from the httpOnly cookie set in AuthController.
// Falls back to a Bearer header so non-browser clients (mobile apps,
// server-to-server calls, Swagger's "Authorize" button) still work.
function extractFromCookieOrHeader(req: Request): string | null {
  const cookieToken = req?.cookies?.[ACCESS_COOKIE];
  if (cookieToken) return cookieToken;

  const authHeader = req?.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    const secret = configService.get('jwt.secret');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: extractFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      isVerified: user.isVerified,
      isVendorApproved: user.isVendorApproved,
    };
  }
}