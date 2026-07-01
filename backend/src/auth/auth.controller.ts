// auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guards';
import { Roles } from '../common/decorator/roles.decorator';
import { CreateUserDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const isProd = process.env.NODE_ENV === 'production';
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============================================================
  // COOKIE HELPERS
  // ============================================================

  private setAuthCookies(res: Response, tokens: any) {
    const baseOpts = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...baseOpts,
      maxAge: tokens.accessTokenExpiresIn * 1000,
    });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...baseOpts,
      path: '/api/auth/refresh',
      maxAge: tokens.refreshTokenExpiresIn * 1000,
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth/refresh' });
  }

  private requestMeta(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }

  // ============================================================
  // AUTH ROUTES
  // ============================================================

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify-email')
  async verifyEmail(
    @Body() body: { email: string; code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(body.email, body.code);
    this.setAuthCookies(res, result.tokens);
    return { message: result.message, user: result.user };
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationCode(body.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setAuthCookies(res, result.tokens);
    return { message: result.message, user: result.user };
  }

  @SkipThrottle()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];
    const result = (this.authService.refresh(
      rawRefreshToken,
      this.requestMeta(req)
    )) as unknown as {
      tokens: {
        accessToken: string;
        refreshToken: string;
        accessTokenExpiresIn: number;
        refreshTokenExpiresIn: number;
      };
      user: unknown;
    };

    this.setAuthCookies(res, result.tokens);
    return { user: result.user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request & { user: { sub: number } }) {
    return this.authService.getCurrentUser(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];
    const result = await this.authService.logout(rawRefreshToken);
    this.clearAuthCookies(res);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() req: Request & { user: { sub: number } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutAll(req.user.sub);
    this.clearAuthCookies(res);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: Request & { user: { sub: number } },
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      req.user.sub,
      body.currentPassword,
      body.newPassword,
    );
  }

  // ============================================================
  // PASSWORD RESET
  // ============================================================

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('verify-reset-code')
  async verifyResetCode(@Body() body: { email: string; code: string }) {
    return this.authService.verifyResetCode(body.email, body.code);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  async resetPassword(@Body() body: { verificationToken: string; newPassword: string }) {
    return this.authService.resetPassword(body.verificationToken, body.newPassword);
  }

  // ============================================================
  // ADMIN ROUTES
  // ============================================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @Post('admin')
  async createAdmin(@Body() dto: CreateUserDto) {
    return this.authService.createAdmin(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @Get('users')
  async listAllUsers() {
    return this.authService.listAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.authService.deleteUser(id);
  }
}