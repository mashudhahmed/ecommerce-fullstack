import { Body, Controller, Post, Delete, Param, Get, HttpException, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TokenBlacklistService } from './token-blacklist.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly blacklistService: TokenBlacklistService,
  ) {}

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  // ✅ NEW: Verify email endpoint
  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; code: string }) {
    try {
      console.log('🎯 CONTROLLER: Starting email verification');
      const result = await this.authService.verifyEmail(body.email, body.code);
      console.log('✅ CONTROLLER: Email verification successful');
      return result;
    } catch (error) {
      console.error('💥 CONTROLLER CATCH: Error in verifyEmail:', error);
      throw new HttpException(
        error.message || 'Verification failed',
        error.status || 500
      );
    }
  }

  // ✅ NEW: Resend verification code endpoint
  @Post('resend-verification')
  resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationCode(body.email);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  // ✅ ADVANCED: Logout current session
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      await this.blacklistService.addToBlacklist(token, 'user_logout');
    }

    return {
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
      logoutType: 'single_session',
    };
  }

  // ✅ ADVANCED: Logout all sessions
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@Request() req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = req.user.id;

    if (token) {
      await this.blacklistService.addToBlacklist(token, 'logout_all_sessions');
    }

    const sessionsEnded = await this.blacklistService.logoutAllUserSessions(userId);

    return {
      message: 'Logged out from all sessions successfully',
      timestamp: new Date().toISOString(),
      sessionsEnded,
      logoutType: 'all_sessions',
    };
  }

  // ✅ ADVANCED: Get blacklisted tokens
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getBlacklistedSessions(@Request() req) {
    const userId = req.user.id;
    const blacklistedTokens = await this.blacklistService.getUserBlacklistedTokens(userId);
    
    return {
      userId,
      blacklistedTokens: blacklistedTokens.map(token => ({
        id: token.id,
        reason: token.reason,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
      })),
    };
  }

  // ✅ ADVANCED: Invalidate specific token
  @Post('invalidate-token')
  @UseGuards(JwtAuthGuard)
  async invalidateSpecificToken(@Body() body: { token: string }) {
    await this.blacklistService.addToBlacklist(body.token, 'manual_invalidation');
    
    return {
      message: 'Token invalidated successfully',
      timestamp: new Date().toISOString(),
    };
  }

  // ✅ STEP 1: Request password reset code
  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.requestPasswordReset(body.email);
  }

  // ✅ STEP 2: Verify the 6-digit code (WITH ERROR HANDLING)
  @Post('verify-reset-code')
  async verifyResetCode(@Body() body: { email: string; code: string }) {
    try {
      console.log('🎯 CONTROLLER: Starting reset code verification');
      console.log('📧 Email:', body.email);
      console.log('🔢 Code:', body.code);
      
      const result = await this.authService.verifyResetCode(body.email, body.code);
      console.log('✅ CONTROLLER: Reset code verification successful');
      return result;
    } catch (error) {
      console.error('💥 CONTROLLER CATCH: Error in verifyResetCode:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || 500
      );
    }
  }

  // ✅ STEP 3: Reset password with verification token
  @Post('reset-password')
  resetPassword(@Body() body: { verificationToken: string; newPassword: string }) {
    return this.authService.resetPassword(body.verificationToken, body.newPassword);
  }

  @Post('admin')
  createAdmin(@Body() dto: { name: string; email: string; password: string }) {
    return this.authService.createAdmin(dto);
  }

  @Get('users')
  listAllUsers() {
    return this.authService.listAllUsers();
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: number) {
    return this.authService.deleteUser(id);
  }
}