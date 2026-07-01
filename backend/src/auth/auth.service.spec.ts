// auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserService } from '../user/user.service';
import { MailerService } from '../mailer/mailer.service';
import { RefreshToken } from './refresh-token.entity';
import { CreateUserDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// ✅ bcrypt configuration - industry standard
export const BCRYPT_ROUNDS = 12;
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ✅ Define TokenPair interface
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  // ============================================================
  // REGISTRATION
  // ============================================================
  async register(dto: CreateUserDto) {
    this.logger.log(`📝 Registration attempt: ${dto.email}`);

    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered. Please login or use a different email.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    
    const user = await this.userService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: 'user',
      isVerified: false,
    });

    const verificationCode = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userService.updateVerificationCode(user.email, verificationCode, expiry);

    this.fireAndForget(
      this.mailerService.sendVerificationEmail(user.email, verificationCode, user.name),
      `verification email to ${user.email}`,
    );

    return {
      success: true,
      message: 'Registration successful. Please check your email for verification code.',
      userId: user.id,
      email: user.email,
      requiresVerification: true,
    };
  }

  // ============================================================
  // LOGIN - ✅ Returns TokenPair
  // ============================================================
  async login(dto: LoginDto, meta: { userAgent?: string; ipAddress?: string }): Promise<{
    message: string;
    tokens: TokenPair;
    user: any;
  }> {
    this.logger.log(`🔐 Login attempt: ${dto.email}`);

    const user = await this.userService.findByEmailWithPassword(dto.email);
    
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in.');
    }

    // ✅ Issue tokens - returns TokenPair
    const tokens = await this.issueTokenPair(user, meta);

    this.fireAndForget(
      this.mailerService.sendLoginNotification(user.email, user.name),
      `login notification to ${user.email}`,
    );

    return {
      message: 'Login successful',
      tokens, // ✅ TokenPair
      user: this.toPublicUser(user),
    };
  }

  // ============================================================
  // REFRESH - ✅ Returns TokenPair
  // ============================================================
  async refresh(rawRefreshToken: string, meta: { userAgent?: string; ipAddress?: string }): Promise<{
    tokens: TokenPair;
    user: any;
  }> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.refreshTokenRepo.findOne({ 
      where: { tokenHash } 
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session. Please login again.');
    }

    // ✅ Rotate refresh token
    stored.revoked = true;
    await this.refreshTokenRepo.save(stored);

    const user = await this.userService.findByIdOrFail(stored.userId);
    
    // ✅ Issue new tokens - returns TokenPair
    const tokens = await this.issueTokenPair(user, meta);

    return { tokens, user: this.toPublicUser(user) };
  }

  // ============================================================
  // VERIFY EMAIL - ✅ Returns TokenPair
  // ============================================================
  async verifyEmail(email: string, code: string): Promise<{
    message: string;
    tokens: TokenPair;
    user: any;
  }> {
    this.logger.log(`📧 Verifying email for: ${email}`);

    const user = await this.userService.verifyUser(email, code);

    this.fireAndForget(
      this.mailerService.sendWelcomeEmail(user.email, user.name),
      `welcome email to ${user.email}`,
    );

    // ✅ Issue tokens - returns TokenPair
    const tokens = await this.issueTokenPair(user, {});

    return {
      message: 'Email verified successfully!',
      tokens, // ✅ TokenPair
      user: this.toPublicUser(user),
    };
  }

  // ============================================================
  // TOKEN ISSUANCE - ✅ Returns TokenPair
  // ============================================================
  private async issueTokenPair(
    user: any,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    // ✅ Access token
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );

    // ✅ Refresh token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        tokenHash,
        userId: user.id,
        expiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      }),
    );

    // ✅ Return TokenPair
    return {
      accessToken,
      refreshToken: rawRefreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    };
  }

  // ============================================================
  // CHANGE PASSWORD
  // ============================================================
  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    this.logger.log(`🔐 Password change attempt for user: ${userId}`);

    const user = await this.userService.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userService.updatePassword(user.id, hashedNewPassword);

    await this.logoutAll(userId);

    this.fireAndForget(
      this.mailerService.sendPasswordChangedConfirmation(user.email, user.name),
      `password changed email to ${user.email}`,
    );

    return { message: 'Password changed successfully' };
  }

  // ============================================================
  // PASSWORD RESET
  // ============================================================
  async resetPassword(rawVerificationToken: string, newPassword: string) {
    this.logger.log(`🔐 Resetting password with token`);

    const tokenHash = this.hashToken(rawVerificationToken);
    const user = await this.userService.findByResetTokenHash(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }
    if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userService.resetPassword(user.email, hashedPassword);
    await this.logoutAll(user.id);

    this.fireAndForget(
      this.mailerService.sendPasswordChangedConfirmation(user.email, user.name),
      `password changed email to ${user.email}`,
    );

    return { message: 'Password reset successfully' };
  }

  // ============================================================
  // RESEND VERIFICATION
  // ============================================================
  async resendVerificationCode(email: string) {
    const user = await this.userService.findByEmail(email);
    const genericResponse = { 
      message: 'If the account exists and is not verified, a new code has been sent' 
    };

    if (!user || user.isVerified) {
      return genericResponse;
    }

    const code = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userService.updateVerificationCode(email, code, expiry);

    this.fireAndForget(
      this.mailerService.sendVerificationEmail(user.email, code, user.name),
      `verification resend to ${user.email}`,
    );

    return genericResponse;
  }

  // ============================================================
  // PASSWORD RESET FLOW
  // ============================================================
  async requestPasswordReset(email: string) {
    this.logger.log(`🔑 Password reset requested for: ${email}`);

    const genericResponse = { 
      message: 'If the email exists, a reset code has been sent' 
    };
    
    const user = await this.userService.findByEmail(email);
    if (!user) return genericResponse;

    const resetCode = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    await this.userService.updateResetCode(email, resetCode, expiry);

    this.fireAndForget(
      this.mailerService.sendPasswordResetCode(user.email, resetCode, user.name),
      `reset code to ${user.email}`,
    );

    return genericResponse;
  }

  async verifyResetCode(email: string, code: string) {
    this.logger.log(`🔑 Verifying reset code for: ${email}`);

    await this.userService.verifyResetCode(email, code);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.userService.setPasswordResetToken(email, tokenHash, expiry);

    return {
      message: 'Code verified successfully',
      verificationToken: rawToken,
    };
  }

  // ============================================================
  // LOGOUT
  // ============================================================
  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) {
      return { message: 'Logged out successfully' };
    }
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.refreshTokenRepo.update({ tokenHash }, { revoked: true });
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: number) {
    const result = await this.refreshTokenRepo.update(
      { userId, revoked: false },
      { revoked: true },
    );
    return {
      message: 'Logged out from all sessions successfully',
      sessionsEnded: result.affected ?? 0,
    };
  }

  // ============================================================
  // GET CURRENT USER
  // ============================================================
  async getCurrentUser(userId: number) {
    const user = await this.userService.findByIdOrFail(userId);
    return this.toPublicUser(user);
  }

  // ============================================================
  // ADMIN
  // ============================================================
  async createAdmin(dto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.userService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
    });

    this.fireAndForget(
      this.mailerService.sendWelcomeEmail(user.email, user.name),
      `admin welcome email to ${user.email}`,
    );

    return { 
      message: 'Admin created successfully', 
      user: this.toPublicUser(user) 
    };
  }

  async listAllUsers() {
    return this.userService.findAll();
  }

  async deleteUser(id: number) {
    const user = await this.userService.findByIdOrFail(id);
    await this.userService.delete(id);
    await this.refreshTokenRepo.update(
      { userId: id, revoked: false }, 
      { revoked: true }
    );

    this.fireAndForget(
      this.mailerService.sendAccountDeletionEmail(user.email, user.name),
      `deletion email to ${user.email}`,
    );

    return { message: 'User deleted successfully' };
  }

  // ============================================================
  // CLEANUP
  // ============================================================
  async purgeExpiredRefreshTokens() {
    const result = await this.refreshTokenRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    this.logger.log(`🧹 Purged ${result.affected} expired refresh tokens`);
    return result;
  }

  // ============================================================
  // HELPERS
  // ============================================================
  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private toPublicUser(user: any) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private fireAndForget(promise: Promise<unknown>, label: string) {
    promise.catch((err) => {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`❌ Failed to send ${label}`, msg);
    });
  }
}