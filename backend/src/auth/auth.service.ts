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
import { RegisterUserDto } from './dto/register-user.dto';
import { RegisterVendorDto } from './dto/register-vendor.dto';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from '../user/user.entity';

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
  ) {}

  // ============================================================
  // REGISTRATION - USER
  // ============================================================
  async registerUser(dto: RegisterUserDto) {
    this.logger.log(`📝 User registration attempt: ${dto.email}`);

    // Check if user exists
    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Create user
    const user = await this.userService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.USER,
      isVerified: false,
    });

    // Generate verification code
    const verificationCode = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userService.updateVerificationCode(user.email, verificationCode, expiry);

    // Send verification email (fire and forget)
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
  // REGISTRATION - VENDOR
  // ============================================================
  async registerVendor(dto: RegisterVendorDto) {
    this.logger.log(`📝 Vendor registration attempt: ${dto.email}`);

    // Check if user exists
    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Create vendor user
    const user = await this.userService.create({
      name: dto.name,
      email: dto.email,
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

    // Generate verification code
    const verificationCode = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userService.updateVerificationCode(user.email, verificationCode, expiry);

    // Send verification email
    this.fireAndForget(
      this.mailerService.sendVerificationEmail(user.email, verificationCode, user.name),
      `verification email to ${user.email}`,
    );

    // Notify admins about new vendor registration
    this.fireAndForget(
      this.mailerService.sendVendorRegistrationNotification(user),
      `vendor registration notification`,
    );

    return {
      success: true,
      message: 'Vendor registration successful. Please check your email for verification code. Your account will be reviewed by admins.',
      userId: user.id,
      email: user.email,
      requiresVerification: true,
      requiresApproval: true,
    };
  }

  // ============================================================
  // LOGIN WITH ATTEMPT TRACKING
  // ============================================================
  
  async login(dto: LoginDto, meta: { userAgent?: string; ipAddress?: string }): Promise<{
    message: string;
    tokens: TokenPair;
    user: any;
  }> {
    this.logger.log(`🔐 Login attempt: ${dto.email}`);

    // ✅ Check if account is locked
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

    // ✅ Clear attempts on successful login
    await this.loginAttemptService.clearAttempts(
      dto.email,
      meta.ipAddress || 'unknown',
    );

    // Check if email is verified
    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in.');
    }

    // Check vendor approval status
    if (user.role === UserRole.VENDOR) {
      if (user.isVendorRejected) {
        throw new ForbiddenException('Your vendor account has been rejected. Please contact support.');
      }
      if (!user.isVendorApproved) {
        throw new ForbiddenException('Your vendor account is pending admin approval.');
      }
    }

    // Issue tokens
    const tokens = await this.issueTokenPair(user, meta);

    // Send login notification
    this.fireAndForget(
      this.mailerService.sendLoginNotification(user.email, user.name),
      `login notification to ${user.email}`,
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
  async refresh(rawRefreshToken: string, meta: { userAgent?: string; ipAddress?: string }): Promise<{
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

    // Validate refresh token
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session. Please login again.');
    }

    // Revoke old refresh token
    stored.revoked = true;
    await this.refreshTokenRepo.save(stored);

    // Get user
    const user = await this.userService.findByIdOrFail(stored.userId);

    // Issue new tokens
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

    // Verify user
    const user = await this.userService.verifyUser(email, code);

    // Send welcome email
    this.fireAndForget(
      this.mailerService.sendWelcomeEmail(user.email, user.name),
      `welcome email to ${user.email}`,
    );

    // Issue tokens
    const tokens = await this.issueTokenPair(user, {});

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

    // Generic response for security (don't reveal if user exists)
    if (!user || user.isVerified) {
      return { 
        message: 'If the account exists and is not verified, a new code has been sent' 
      };
    }

    // Generate new code
    const code = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userService.updateVerificationCode(email, code, expiry);

    // Send email
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
    // Generate access token
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

    // Generate refresh token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    // Store refresh token
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

    // Get user with password
    const user = await this.userService.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userService.updatePassword(user.id, hashedNewPassword);

    // Revoke all sessions
    await this.logoutAll(userId);

    // Send confirmation email
    this.fireAndForget(
      this.mailerService.sendPasswordChangedConfirmation(user.email, user.name),
      `password changed email to ${user.email}`,
    );

    return { message: 'Password changed successfully' };
  }

  // ============================================================
  // PASSWORD RESET FLOW
  // ============================================================
  async requestPasswordReset(email: string) {
    this.logger.log(`🔑 Password reset requested for: ${email}`);

    const genericResponse = {
      message: 'If the email exists, a reset code has been sent',
    };

    const user = await this.userService.findByEmail(email);
    if (!user) return genericResponse;

    // Generate reset code
    const resetCode = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    await this.userService.updateResetCode(email, resetCode, expiry);

    // Send reset code email
    this.fireAndForget(
      this.mailerService.sendPasswordResetCode(user.email, resetCode, user.name),
      `reset code to ${user.email}`,
    );

    return genericResponse;
  }

  async verifyResetCode(email: string, code: string) {
    this.logger.log(`🔑 Verifying reset code for: ${email}`);

    // Verify code
    await this.userService.verifyResetCode(email, code);

    // Generate verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.userService.setPasswordResetToken(email, tokenHash, expiry);

    return {
      message: 'Code verified successfully',
      verificationToken: rawToken,
    };
  }

  async resetPassword(verificationToken: string, newPassword: string) {
    this.logger.log(`🔐 Resetting password with token`);

    const tokenHash = this.hashToken(verificationToken);
    const user = await this.userService.findByResetTokenHash(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }
    if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userService.resetPassword(user.email, hashedPassword);

    // Revoke all sessions
    await this.logoutAll(user.id);

    // Send confirmation
    this.fireAndForget(
      this.mailerService.sendPasswordChangedConfirmation(user.email, user.name),
      `password changed email to ${user.email}`,
    );

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
  // VENDOR MANAGEMENT - GET PENDING VENDORS
  // ============================================================
  async getPendingVendors() {
    this.logger.log('📋 Fetching pending vendors');
    return this.userService.findPendingVendors();
  }

  // ============================================================
  // VENDOR MANAGEMENT - GET APPROVED VENDORS
  // ============================================================
  async getApprovedVendors() {
    this.logger.log('📋 Fetching approved vendors');
    return this.userService.findApprovedVendors();
  }

  // ============================================================
  // VENDOR MANAGEMENT - GET VENDOR BY ID
  // ============================================================
  async getVendorById(vendorId: number) {
    this.logger.log(`📋 Fetching vendor: ${vendorId}`);
    const vendor = await this.userService.findByIdOrFail(vendorId);
    
    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }

    return this.toPublicUser(vendor);
  }

  // ============================================================
  // VENDOR MANAGEMENT - GET ALL VENDORS
  // ============================================================
  async getAllVendors() {
    this.logger.log('📋 Fetching all vendors');
    const vendors = await this.userService.findByRole(UserRole.VENDOR);
    return vendors.map((v) => this.toPublicUser(v));
  }

  // ============================================================
  // VENDOR MANAGEMENT - APPROVE VENDOR
  // ============================================================
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

    // Approve vendor
    await this.userService.update(vendor.id, {
      isVendorApproved: true,
      isVendorRejected: false,
      vendorRejectionReason: null,
    });

    // Send approval email
    this.fireAndForget(
      this.mailerService.sendVendorApprovalEmail(vendor.email, vendor.name),
      `vendor approval email to ${vendor.email}`,
    );

    // Refresh user data
    const updatedVendor = await this.userService.findByIdOrFail(vendorId);

    return {
      message: 'Vendor approved successfully',
      vendor: this.toPublicUser(updatedVendor),
    };
  }

  // ============================================================
  // VENDOR MANAGEMENT - REJECT VENDOR
  // ============================================================
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

    // Reject vendor
    await this.userService.update(vendor.id, {
      isVendorApproved: false,
      isVendorRejected: true,
      vendorRejectionReason: reason || 'No reason provided',
    });

    // Send rejection email
    this.fireAndForget(
      this.mailerService.sendVendorRejectionEmail(vendor.email, vendor.name, reason),
      `vendor rejection email to ${vendor.email}`,
    );

    return {
      message: 'Vendor rejected successfully',
    };
  }

  // ============================================================
  // VENDOR MANAGEMENT - RESUBMIT VENDOR APPLICATION
  // ============================================================
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

    // Reset rejection status
    await this.userService.update(vendor.id, {
      isVendorRejected: false,
      vendorRejectionReason: null,
      isVendorApproved: false,
    });

    // Notify admins about resubmission
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

  // ============================================================
  // VENDOR MANAGEMENT - GET VENDOR STATISTICS
  // ============================================================
  async getVendorStatistics() {
    this.logger.log('📊 Fetching vendor statistics');

    const [
      totalVendors,
      pendingVendors,
      approvedVendors,
      rejectedVendors,
    ] = await Promise.all([
      this.userService.countByRole(UserRole.VENDOR),
      this.userService.countPendingVendors(),
      this.userService.countByRole(UserRole.VENDOR).then(count => 
        this.userService.findApprovedVendors().then(vendors => vendors.length)
      ),
      this.userService.findByRole(UserRole.VENDOR).then(vendors => 
        vendors.filter(v => v.isVendorRejected).length
      ),
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

  // ============================================================
  // VENDOR MANAGEMENT - BULK APPROVE VENDORS
  // ============================================================
  async bulkApproveVendors(vendorIds: number[], adminId: number) {
    this.logger.log(`✅ Bulk approving ${vendorIds.length} vendors by admin: ${adminId}`);

    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const vendorId of vendorIds) {
      try {
        const result = await this.approveVendor(vendorId, adminId);
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

  // ============================================================
  // VENDOR MANAGEMENT - BULK REJECT VENDORS
  // ============================================================
  async bulkRejectVendors(
    vendorIds: number[],
    adminId: number,
    reason?: string,
  ) {
    this.logger.log(`❌ Bulk rejecting ${vendorIds.length} vendors by admin: ${adminId}`);

    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const vendorId of vendorIds) {
      try {
        const result = await this.rejectVendor(vendorId, adminId, reason);
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

  // ============================================================
  // VENDOR MANAGEMENT - SEARCH VENDORS
  // ============================================================
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

  // ============================================================
  // VENDOR MANAGEMENT - GET VENDOR BY BUSINESS NAME
  // ============================================================
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
    // Check if user exists
    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Create admin
    const user = await this.userService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.ADMIN,
      isVerified: true,
      isVendorApproved: false,
      isVendorRejected: false,
    });

    // Send welcome email
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

    // Prevent deleting super admin
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot delete superadmin account');
    }

    // Delete user
    await this.userService.delete(id);

    // Revoke all refresh tokens
    await this.refreshTokenRepo.update(
      { userId: id, revoked: false },
      { revoked: true },
    );

    // Send deletion email
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