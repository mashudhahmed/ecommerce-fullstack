// src/auth/auth.controller.ts
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
  Patch,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service'; // ✅ Added
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RegisterUserDto } from './dto/register-user.dto';
import { RegisterVendorDto } from './dto/register-vendor.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { UserRole } from '../user/user.entity';
// 2FA DTOs
import { EnableTwoFactorDto, VerifyTwoFactorDto, DisableTwoFactorDto } from './dto/enable-2fa.dto';

const isProd = process.env.NODE_ENV === 'production';
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

// ✅ Must match the actual mounted route (global prefix: api/v1)
const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService, // ✅ Injected
  ) {}

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
      path: REFRESH_COOKIE_PATH,
      maxAge: tokens.refreshTokenExpiresIn * 1000,
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }

  private requestMeta(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };
  }

  // ============================================================
  // REGISTRATION
  // ============================================================
  @ApiOperation({ summary: 'Register a new user (customer)' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async registerUser(@Body(new ValidationPipe()) dto: RegisterUserDto) {
    return this.authService.registerUser(dto);
  }

  @ApiOperation({ summary: 'Register a new vendor' })
  @ApiResponse({ status: 201, description: 'Vendor registered successfully' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register/vendor')
  async registerVendor(@Body(new ValidationPipe()) dto: RegisterVendorDto) {
    return this.authService.registerVendor(dto);
  }

  // ============================================================
  // EMAIL VERIFICATION
  // ============================================================
  @ApiOperation({ summary: 'Verify email with code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-email')
  async verifyEmail(
    @Body(new ValidationPipe()) dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(dto.email, dto.code);
    this.setAuthCookies(res, result.tokens);
    return { message: result.message, user: result.user };
  }

  @ApiOperation({ summary: 'Resend verification code' })
  @ApiResponse({ status: 200, description: 'Verification code sent' })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationCode(body.email);
  }

  // ============================================================
  // LOGIN / LOGOUT
  // ============================================================
  @ApiOperation({ summary: 'Login to the application' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(
    @Body(new ValidationPipe()) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, this.requestMeta(req));
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
    const result = await this.authService.refresh(
      rawRefreshToken,
      this.requestMeta(req),
    );
    this.setAuthCookies(res, result.tokens);
    return { user: result.user };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request & { user: { sub: number } }) {
    return this.authService.getCurrentUser(req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];
    const result = await this.authService.logout(rawRefreshToken);
    this.clearAuthCookies(res);
    return result;
  }

  @ApiBearerAuth()
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

  // ============================================================
  // PASSWORD MANAGEMENT
  // ============================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: Request & { user: { sub: number } },
    @Body(new ValidationPipe()) dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-reset-code')
  async verifyResetCode(@Body(new ValidationPipe()) dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto.email, dto.code);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body(new ValidationPipe()) dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.verificationToken,
      dto.newPassword,
    );
  }

  // ============================================================
  // VENDOR MANAGEMENT (Admin/SuperAdmin only)
  // ============================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('vendors/pending')
  async getPendingVendors() {
    return this.authService.getPendingVendors();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('vendors/:id/approve')
  async approveVendor(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { sub: number } },
  ) {
    return this.authService.approveVendor(id, req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('vendors/:id/reject')
  async rejectVendor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Req() req: Request & { user: { sub: number } },
  ) {
    return this.authService.rejectVendor(id, req.user.sub, body.reason);
  }

  // ============================================================
  // TWO-FACTOR AUTHENTICATION (2FA) ENDPOINTS – ✅ Added
  // ============================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiResponse({ status: 200, description: 'Secret and QR code generated' })
  async generateTwoFactor(@Req() req: Request & { user: { sub: number } }) {
    return this.twoFactorService.generateSecret(req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @ApiOperation({ summary: 'Enable 2FA with TOTP verification' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  async enableTwoFactor(
    @Req() req: Request & { user: { sub: number } },
    @Body(new ValidationPipe()) dto: VerifyTwoFactorDto,
  ) {
    const result = await this.twoFactorService.verifyAndEnable(req.user.sub, dto.token);
    return {
      message: '2FA enabled successfully',
      backupCodes: result.backupCodes,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  @ApiOperation({ summary: 'Verify TOTP token (for login flow)' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  async verifyTwoFactor(
    @Req() req: Request & { user: { sub: number } },
    @Body(new ValidationPipe()) dto: VerifyTwoFactorDto,
  ) {
    const valid = await this.twoFactorService.verifyToken(req.user.sub, dto.token);
    return { valid };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  async disableTwoFactor(
    @Req() req: Request & { user: { sub: number } },
    @Body(new ValidationPipe()) dto: DisableTwoFactorDto,
  ) {
    await this.twoFactorService.disable(req.user.sub, dto.token);
    return { message: '2FA disabled successfully' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/backup-codes')
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiResponse({ status: 200, description: 'New backup codes generated' })
  async regenerateBackupCodes(@Req() req: Request & { user: { sub: number } }) {
    const codes = await this.twoFactorService.generateBackupCodes(req.user.sub);
    return { backupCodes: codes };
  }
}