// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
  ForbiddenException,
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
import { LoginAttemptService } from './login-attempt.service';
import { TwoFactorService } from './two-factor.service';
import { TwoFactor } from './two-factor.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { RegisterVendorDto } from './dto/register-vendor.dto';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from '../user/user.entity';
import { EventsGateway } from '../events/events.gateway';

export const BCRYPT_ROUNDS = 12;
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

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
    private readonly loginAttemptService: LoginAttemptService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly eventsGateway: EventsGateway,
    private readonly twoFactorService: TwoFactorService,
    @InjectRepository(TwoFactor)
    private readonly twoFactorRepo: Repository<TwoFactor>,
  ) {}

  // ============================================================
  // REGISTRATION - USER
  // ============================================================
  async registerUser(dto: RegisterUserDto) {
    this.logger.log(`📝 User registration attempt: ${dto.email}`);

    // ✅ Normalize email
    const email = dto.email.toLowerCase().trim();

    // ✅ Check if user exists using the fixed findByEmail
    const existingUser = await this.userService.findByEmail(email);
    
    if (existingUser) {
      this.logger.warn(`⚠️ Registration attempt with existing email: ${email}`);
      throw new ConflictException('Email already registered. Please login instead.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.userService.create({
      name: dto.name,
      email: email,
      password: hashedPassword,
      role: UserRole.USER,
      isVerified: false,
    });

    const verificationCode = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userService.updateVerificationCode(user.email, verificationCode, expiry);

    this.fireAndForget(
      this.mailerService.sendVerificationEmail(user.email, verificationCode, user.name),
      `verification email to ${user.email}`,
    );

    this.eventsGateway.notifyUser(
      user.id.toString(),
      'user_registered',
      { userId: user.id, email: user.email, role: user.role },
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
  // REGISTRATION - VENDOR
  // ============================================================
  async registerVendor(dto: RegisterVendorDto) {
    this.logger.log(`📝 Vendor registration attempt: ${dto.email}`);

    // ✅ Normalize email
    const email = dto.email.toLowerCase().trim();

    // ✅ Check if user exists using the fixed findByEmail
    const existingUser = await this.userService.findByEmail(email);
    
    if (existingUser) {
      this.logger.warn(`⚠️ Vendor registration attempt with existing email: ${email}`);
      throw new ConflictException('Email already registered. Please login instead.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.userService.create({
      name: dto.name,
      email: email,
      password: hashedPassword,
      role: UserRole.VENDOR,
      isVerified: false,
      isVendorApproved: false,
      isVendorRejected: false,
      vendorBusinessName: dto.businessName,
      vendorBusinessDescription: dto.businessDescription,
      vendorPhoneNumber: dto.phoneNumber,
      vendorAddress: dto.address,
      vendorBusinessRegistration: dto.businessRegistration,
    });

    const verificationCode = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userService.updateVerificationCode(user.email, verificationCode, expiry);

    this.fireAndForget(
      this.mailerService.sendVerificationEmail(user.email, verificationCode, user.name),
      `verification email to ${user.email}`,
    );

    this.fireAndForget(
      this.mailerService.sendVendorRegistrationNotification(user),
      `vendor registration notification`,
    );

    this.eventsGateway.notifyUser(
      user.id.toString(),
      'vendor_registered',
      { userId: user.id, email: user.email, businessName: user.vendorBusinessName },
    );

    return {
      success: true,
      message:
        'Vendor registration successful. Please check your email for verification code. Your account will be reviewed by admins.',
      userId: user.id,
      email: user.email,
      requiresVerification: true,
      requiresApproval: true,
    };
  }

  // ============================================================
  // LOGIN WITH ATTEMPT TRACKING AND 2FA
  // ============================================================
  async login(
    dto: LoginDto,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<{
    message: string;
    tokens: TokenPair;
    user: any;
  }> {
    this.logger.log(`🔐 Login attempt: ${dto.email}`);

    // Account lockout check
    const isLocked = await this.loginAttemptService.isAccountLocked(
      dto.email,
      meta.ipAddress || 'unknown',
    );

    if (isLocked) {
      const remainingMinutes = await this.loginAttemptService.getLockoutRemainingMinutes(
        dto.email,
        meta.ipAddress || 'unknown',
      );
      throw new UnauthorizedException(
        `Too many failed attempts. Please try again in ${remainingMinutes} minutes.`,
      );
    }

    // Find user with password
    const user = await this.userService.findByEmailWithPassword(dto.email);

    if (!user) {
      await this.loginAttemptService.recordAttempt(
        dto.email,
        meta.ipAddress || 'unknown',
        false,
        meta.userAgent,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      await this.loginAttemptService.recordAttempt(
        dto.email,
        meta.ipAddress || 'unknown',
        false,
        meta.userAgent,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    // Clear failed attempts on success
    await this.loginAttemptService.clearAttempts(dto.email, meta.ipAddress || 'unknown');

    // Check if email is verified
    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in.');
    }

    // Vendor approval checks
    if (user.role === UserRole.VENDOR) {
      if (user.isVendorRejected) {
        throw new ForbiddenException(
          'Your vendor account has been rejected. Please contact support.',
        );
      }
      if (!user.isVendorApproved) {
        throw new ForbiddenException('Your vendor account is pending admin approval.');
      }
    }

    // ============================================================
    // TWO-FACTOR AUTHENTICATION CHECK
    // ============================================================
    const twoFactor = await this.twoFactorRepo.findOne({
      where: { userId: user.id, isEnabled: true },
    });

    if (twoFactor && !dto.twoFactorToken) {
      throw new UnauthorizedException('2FA token required');
    }

    if (twoFactor && dto.twoFactorToken) {
      const valid = await this.twoFactorService.verifyToken(user.id, dto.twoFactorToken);
      if (!valid) {
        throw new UnauthorizedException('Invalid 2FA token');
      }
    }

    // Issue tokens
    const tokens = await this.issueTokenPair(user, meta);

    // Send login notification
    this.fireAndForget(
      this.mailerService.sendLoginNotification(user.email, user.name),
      `login notification to ${user.email}`,
    );

    this.eventsGateway.notifyUser(
      user.id.toString(),
      'user_logged_in',
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        timestamp: new Date().toISOString(),
        ip: meta.ipAddress,
      },
    );

    return {
      message: 'Login successful',
      tokens,
      user: this.toPublicUser(user),
    };
  }

  // ============================================================
  // REFRESH TOKEN
  // ============================================================
  async refresh(
    rawRefreshToken: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<{
    tokens: TokenPair;
    user: any;
  }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session. Please login again.');
    }

    stored.revoked = true;
    await this.refreshTokenRepo.save(stored);

    const user = await this.userService.findByIdOrFail(stored.userId);
    const tokens = await this.issueTokenPair(user, meta);

    return { tokens, user: this.toPublicUser(user) };
  }

  // ============================================================
  // VERIFY EMAIL
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

    const tokens = await this.issueTokenPair(user, {});

    this.eventsGateway.notifyUser(
      user.id.toString(),
      'email_verified',
      { userId: user.id, email: user.email },
    );

    return {
      message: 'Email verified successfully!',
      tokens,
      user: this.toPublicUser(user),
    };
  }

  // ============================================================
  // RESEND VERIFICATION CODE
  // ============================================================
  async resendVerificationCode(email: string) {
    this.logger.log(`📧 Resending verification code for: ${email}`);

    const user = await this.userService.findByEmail(email);

    if (!user || user.isVerified) {
      return {
        message:
          'If the account exists and is not verified, a new code has been sent',
      };
    }

    const code = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userService.updateVerificationCode(email, code, expiry);

    this.fireAndForget(
      this.mailerService.sendVerificationEmail(user.email, code, user.name),
      `verification resend to ${user.email}`,
    );

    return { message: 'Verification code sent successfully' };
  }

  // ============================================================
  // TOKEN ISSUANCE
  // ============================================================
  private async issueTokenPair(
    user: User,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isVendorApproved: user.isVendorApproved,
        isVendorRejected: user.isVendorRejected,
      },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );

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

    this.eventsGateway.notifyUser(
      user.id.toString(),
      'password_changed',
      { userId: user.id },
    );

    return { message: 'Password changed successfully' };
  }

  // ============================================================
  // PASSWORD RESET FLOW
  // ============================================================

  /**
   * Request password reset - sends 6-digit code to user's email
   * Always returns success message for security (prevents email enumeration)
   */
  async requestPasswordReset(email: string) {
    this.logger.log(`🔑 Password reset requested for: ${email}`);

    // ✅ Always return this message for security
    const genericResponse = {
      message: 'If the email exists, a reset code has been sent',
    };

    // Find user
    const user = await this.userService.findByEmail(email);
    if (!user) {
      this.logger.warn(`⚠️ Password reset requested for non-existent email: ${email}`);
      return genericResponse;
    }

    // Generate and save reset code
    const resetCode = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await this.userService.updateResetCode(email, resetCode, expiry);

    // ✅ Send email with the code
    try {
      await this.mailerService.sendPasswordResetCode(user.email, resetCode, user.name);
      this.logger.log(`✅ Reset code sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send reset code to ${email}`, error);
      // Still return success to prevent email enumeration
    }

    return genericResponse;
  }

  /**
   * Verify reset code - validates the 6-digit code
   * Returns verification token for password reset
   */
  async verifyResetCode(email: string, code: string) {
    this.logger.log(`🔑 Verifying reset code for: ${email}`);

    try {
      // ✅ Verify the code exists and is valid
      const user = await this.userService.verifyResetCode(email, code);
      
      if (!user) {
        throw new BadRequestException('Invalid or expired verification code');
      }

      // ✅ Generate verification token for next step
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await this.userService.setPasswordResetToken(email, tokenHash, expiry);

      this.logger.log(`✅ Reset code verified for: ${email}`);

      return {
        message: 'Code verified successfully',
        verificationToken: rawToken,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to verify reset code for: ${email}`, error);
      throw new BadRequestException('Invalid or expired verification code');
    }
  }

  /**
   * Reset password - uses verification token to set new password
   */
  async resetPassword(verificationToken: string, newPassword: string) {
    this.logger.log(`🔐 Resetting password with token`);

    const tokenHash = this.hashToken(verificationToken);
    const user = await this.userService.findByResetTokenHash(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    // ✅ Check if token is expired
    if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    // ✅ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    
    // ✅ Reset password and clear all reset tokens
    await this.userService.resetPassword(user.email, hashedPassword);

    // ✅ Logout from all sessions
    await this.logoutAll(user.id);

    // ✅ Send confirmation email
    this.fireAndForget(
      this.mailerService.sendPasswordChangedConfirmation(user.email, user.name),
      `password changed email to ${user.email}`,
    );

    this.logger.log(`✅ Password reset successfully for: ${user.email}`);

    return { message: 'Password reset successfully' };
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
  // VENDOR MANAGEMENT
  // ============================================================
  async getPendingVendors() {
    this.logger.log('📋 Fetching pending vendors');
    return this.userService.findPendingVendors();
  }

  async getApprovedVendors() {
    this.logger.log('📋 Fetching approved vendors');
    return this.userService.findApprovedVendors();
  }

  async getVendorById(vendorId: number) {
    this.logger.log(`📋 Fetching vendor: ${vendorId}`);
    const vendor = await this.userService.findByIdOrFail(vendorId);
    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }
    return this.toPublicUser(vendor);
  }

  async getAllVendors() {
    this.logger.log('📋 Fetching all vendors');
    const vendors = await this.userService.findByRole(UserRole.VENDOR);
    return vendors.map((v) => this.toPublicUser(v));
  }

  async approveVendor(vendorId: number, adminId: number) {
    this.logger.log(`✅ Approving vendor: ${vendorId} by admin: ${adminId}`);

    const vendor = await this.userService.findByIdOrFail(vendorId);

    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }
    if (vendor.isVendorApproved) {
      throw new BadRequestException('Vendor is already approved');
    }
    if (vendor.isVendorRejected) {
      throw new BadRequestException('Vendor has been rejected. Cannot approve.');
    }

    await this.userService.update(vendor.id, {
      isVendorApproved: true,
      isVendorRejected: false,
      vendorRejectionReason: null,
    });

    this.fireAndForget(
      this.mailerService.sendVendorApprovalEmail(vendor.email, vendor.name),
      `vendor approval email to ${vendor.email}`,
    );

    const updatedVendor = await this.userService.findByIdOrFail(vendorId);

    this.eventsGateway.notifyUser(
      vendorId.toString(),
      'vendor_approved',
      { vendorId, approvedAt: new Date().toISOString() },
    );

    return {
      message: 'Vendor approved successfully',
      vendor: this.toPublicUser(updatedVendor),
    };
  }

  async rejectVendor(vendorId: number, adminId: number, reason?: string) {
    this.logger.log(`❌ Rejecting vendor: ${vendorId} by admin: ${adminId}`);

    const vendor = await this.userService.findByIdOrFail(vendorId);

    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }
    if (vendor.isVendorApproved) {
      throw new BadRequestException('Vendor is already approved');
    }
    if (vendor.isVendorRejected) {
      throw new BadRequestException('Vendor is already rejected');
    }

    await this.userService.update(vendor.id, {
      isVendorApproved: false,
      isVendorRejected: true,
      vendorRejectionReason: reason || 'No reason provided',
    });

    this.fireAndForget(
      this.mailerService.sendVendorRejectionEmail(vendor.email, vendor.name, reason),
      `vendor rejection email to ${vendor.email}`,
    );

    this.eventsGateway.notifyUser(
      vendorId.toString(),
      'vendor_rejected',
      { vendorId, reason, rejectedAt: new Date().toISOString() },
    );

    return {
      message: 'Vendor rejected successfully',
    };
  }

  async resubmitVendorApplication(vendorId: number) {
    this.logger.log(`🔄 Resubmitting vendor application: ${vendorId}`);

    const vendor = await this.userService.findByIdOrFail(vendorId);

    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }
    if (vendor.isVendorApproved) {
      throw new BadRequestException('Vendor is already approved');
    }
    if (!vendor.isVendorRejected) {
      throw new BadRequestException('Vendor application is not rejected');
    }

    await this.userService.update(vendor.id, {
      isVendorRejected: false,
      vendorRejectionReason: null,
      isVendorApproved: false,
    });

    const updatedVendor = await this.userService.findByIdOrFail(vendorId);
    this.fireAndForget(
      this.mailerService.sendVendorRegistrationNotification(updatedVendor),
      `vendor resubmission notification`,
    );

    return {
      message: 'Vendor application resubmitted successfully',
      vendor: this.toPublicUser(updatedVendor),
    };
  }

  async getVendorStatistics() {
    this.logger.log('📊 Fetching vendor statistics');

    const [totalVendors, pendingVendors, approvedVendors, rejectedVendors] =
      await Promise.all([
        this.userService.countByRole(UserRole.VENDOR),
        this.userService.countPendingVendors(),
        this.userService
          .countByRole(UserRole.VENDOR)
          .then(() => this.userService.findApprovedVendors().then((v) => v.length)),
        this.userService
          .findByRole(UserRole.VENDOR)
          .then((v) => v.filter((u) => u.isVendorRejected).length),
      ]);

    return {
      totalVendors,
      pendingVendors,
      approvedVendors,
      rejectedVendors,
      approvalRate: totalVendors > 0 ? (approvedVendors / totalVendors) * 100 : 0,
      timestamp: new Date().toISOString(),
    };
  }

  async bulkApproveVendors(vendorIds: number[], adminId: number) {
    this.logger.log(`✅ Bulk approving ${vendorIds.length} vendors by admin: ${adminId}`);

    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const vendorId of vendorIds) {
      try {
        await this.approveVendor(vendorId, adminId);
        results.success.push(vendorId);
      } catch (error: any) {
        results.failed.push({
          id: vendorId,
          error: error.message || 'Unknown error',
        });
      }
    }

    return {
      message: `Approved ${results.success.length} vendors, ${results.failed.length} failed`,
      results,
    };
  }

  async bulkRejectVendors(vendorIds: number[], adminId: number, reason?: string) {
    this.logger.log(`❌ Bulk rejecting ${vendorIds.length} vendors by admin: ${adminId}`);

    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const vendorId of vendorIds) {
      try {
        await this.rejectVendor(vendorId, adminId, reason);
        results.success.push(vendorId);
      } catch (error: any) {
        results.failed.push({
          id: vendorId,
          error: error.message || 'Unknown error',
        });
      }
    }

    return {
      message: `Rejected ${results.success.length} vendors, ${results.failed.length} failed`,
      results,
    };
  }

  async searchVendors(query: string) {
    this.logger.log(`🔍 Searching vendors with query: ${query}`);

    if (!query || query.length < 2) {
      return [];
    }

    const vendors = await this.userService.searchUsers(query);
    return vendors
      .filter((v) => v.role === UserRole.VENDOR)
      .map((v) => this.toPublicUser(v));
  }

  async getVendorByBusinessName(businessName: string) {
    this.logger.log(`🔍 Finding vendor by business name: ${businessName}`);

    const user = await this.userService.findOne({
      vendorBusinessName: businessName,
      role: UserRole.VENDOR,
      isVendorApproved: true,
    });

    if (!user) {
      throw new NotFoundException(`Vendor with business name "${businessName}" not found`);
    }

    return this.toPublicUser(user);
  }

  // ============================================================
  // ADMIN MANAGEMENT (Super Admin Only)
  // ============================================================
  async createAdmin(dto: RegisterUserDto) {
    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.userService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.ADMIN,
      isVerified: true,
      isVendorApproved: false,
      isVendorRejected: false,
    });

    this.fireAndForget(
      this.mailerService.sendWelcomeEmail(user.email, user.name),
      `admin welcome email to ${user.email}`,
    );

    return {
      message: 'Admin created successfully',
      user: this.toPublicUser(user),
    };
  }

  async listAllUsers() {
    return this.userService.findAll();
  }

  async deleteUser(id: number) {
    const user = await this.userService.findByIdOrFail(id);

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot delete superadmin account');
    }

    await this.userService.delete(id);
    await this.refreshTokenRepo.update(
      { userId: id, revoked: false },
      { revoked: true },
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

  private toPublicUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isVendorApproved: user.isVendorApproved,
      isVendorRejected: user.isVendorRejected,
      vendorBusinessName: user.vendorBusinessName,
      vendorBusinessDescription: user.vendorBusinessDescription,
      vendorPhoneNumber: user.vendorPhoneNumber,
      vendorAddress: user.vendorAddress,
      vendorBusinessRegistration: user.vendorBusinessRegistration,
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