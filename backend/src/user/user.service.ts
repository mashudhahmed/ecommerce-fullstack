// src/user/user.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';

export const BCRYPT_ROUNDS = 12;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ============================================================
  // FIND METHODS
  // ============================================================

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Find a user by email with password (for login)
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    if (!email) return null;
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * Find a user by ID
   */
  async findById(id: number): Promise<User | null> {
    if (!id) return null;
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * Find a user by ID with password (for password changes)
   */
  async findByIdWithPassword(id: number): Promise<User | null> {
    if (!id) return null;
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  /**
   * Find a single user by criteria
   */
  async findOne(where: FindOptionsWhere<User>): Promise<User | null> {
    if (!where || Object.keys(where).length === 0) return null;
    return this.userRepository.findOne({ where });
  }

  /**
   * Find a single user by criteria or fail
   */
  async findOneOrFail(where: FindOptionsWhere<User>): Promise<User> {
    const user = await this.findOne(where);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Find a user by ID or throw NotFoundException
   */
  async findByIdOrFail(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Find a user by email or throw NotFoundException
   */
  async findByEmailOrFail(email: string): Promise<User> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  /**
   * Find a user by reset token hash
   */
  async findByResetTokenHash(tokenHash: string): Promise<User | null> {
    if (!tokenHash) return null;
    return this.userRepository.findOne({
      where: { resetTokenHash: tokenHash },
    });
  }

  /**
   * Find pending vendors (not approved yet)
   */
  async findPendingVendors(): Promise<User[]> {
    return this.userRepository.find({
      where: {
        role: UserRole.VENDOR,
        isVendorApproved: false,
        isVerified: true,
      },
      select: [
        'id',
        'name',
        'email',
        'createdAt',
        'vendorBusinessName',
        'vendorBusinessDescription',
        'vendorPhoneNumber',
        'vendorAddress',
        'vendorBusinessRegistration',
      ],
    });
  }

  /**
   * Find approved vendors
   */
  async findApprovedVendors(): Promise<User[]> {
    return this.userRepository.find({
      where: {
        role: UserRole.VENDOR,
        isVendorApproved: true,
        isVerified: true,
      },
      select: [
        'id',
        'name',
        'email',
        'vendorBusinessName',
        'vendorBusinessDescription',
        'createdAt',
      ],
    });
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    return this.userRepository.find({
      where: { role },
      select: [
        'id',
        'name',
        'email',
        'role',
        'isVerified',
        'isVendorApproved',
        'createdAt',
      ],
    });
  }

  /**
   * Find all users with optional filters.
   */
  async findAll(filters?: {
    role?: UserRole;
    isVerified?: boolean;
    isVendorApproved?: boolean;
    excludeSuperAdmin?: boolean;
  }): Promise<User[]> {
    const where: FindOptionsWhere<User> = {};
    if (filters?.role) where.role = filters.role;
    if (filters?.isVerified !== undefined) where.isVerified = filters.isVerified;
    if (filters?.isVendorApproved !== undefined)
      where.isVendorApproved = filters.isVendorApproved;

    if (filters?.excludeSuperAdmin && !filters?.role) {
      where.role = Not(UserRole.SUPER_ADMIN);
    }

    return this.userRepository.find({
      where,
      select: [
        'id',
        'name',
        'email',
        'role',
        'isVerified',
        'isVendorApproved',
        'vendorBusinessName',
        'createdAt',
        'updatedAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================================
  // COUNT METHODS
  // ============================================================

  /**
   * Count total users
   */
  async countUsers(): Promise<number> {
    return this.userRepository.count();
  }

  /**
   * Count users by role
   */
  async countByRole(role: UserRole): Promise<number> {
    return this.userRepository.count({ where: { role } });
  }

  /**
   * Count verified users
   */
  async countVerifiedUsers(): Promise<number> {
    return this.userRepository.count({ where: { isVerified: true } });
  }

  /**
   * Count pending vendors
   */
  async countPendingVendors(): Promise<number> {
    return this.userRepository.count({
      where: {
        role: UserRole.VENDOR,
        isVendorApproved: false,
        isVerified: true,
      },
    });
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    totalVendors: number;
    totalAdmins: number;
    totalSuperAdmins: number;
    verifiedUsers: number;
    pendingVendors: number;
    approvedVendors: number;
  }> {
    const [
      totalUsers,
      totalVendors,
      totalAdmins,
      totalSuperAdmins,
      verifiedUsers,
      pendingVendors,
      approvedVendors,
    ] = await Promise.all([
      this.countUsers(),
      this.countByRole(UserRole.VENDOR),
      this.countByRole(UserRole.ADMIN),
      this.countByRole(UserRole.SUPER_ADMIN),
      this.countVerifiedUsers(),
      this.countPendingVendors(),
      this.userRepository.count({
        where: {
          role: UserRole.VENDOR,
          isVendorApproved: true,
          isVerified: true,
        },
      }),
    ]);

    return {
      totalUsers,
      totalVendors,
      totalAdmins,
      totalSuperAdmins,
      verifiedUsers,
      pendingVendors,
      approvedVendors,
    };
  }

  // ============================================================
  // CREATE METHODS – WITH PASSWORD HASHING (SECURITY FIX)
  // ============================================================

  /**
   * Create a new user
   * Automatically hashes password if not already hashed.
   */
  async create(userData: Partial<User>): Promise<User> {
    if (!userData.email) {
      throw new BadRequestException('Email is required');
    }
    if (!userData.password) {
      throw new BadRequestException('Password is required');
    }
    if (!userData.name) {
      throw new BadRequestException('Name is required');
    }

    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // ✅ Hash password if not already hashed (security fix)
    if (userData.password && !userData.password.startsWith('$2b$')) {
      userData.password = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);
    }

    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User created: ${savedUser.email}`);
    return savedUser;
  }

  /**
   * Create a vendor user with validation
   */
  async createVendor(vendorData: Partial<User>): Promise<User> {
    vendorData.role = UserRole.VENDOR;
    vendorData.isVendorApproved = false;
    vendorData.isVerified = false;
    return this.create(vendorData);
  }

  // ============================================================
  // UPDATE METHODS
  // ============================================================

  /**
   * Update a user
   */
  async update(id: number, updateData: Partial<User>): Promise<User> {
    const user = await this.findByIdOrFail(id);

    if (updateData.password) {
      // Hash only if not already hashed
      if (!updateData.password.startsWith('$2b$')) {
        updateData.password = await bcrypt.hash(updateData.password, BCRYPT_ROUNDS);
      }
    }

    Object.assign(user, updateData);
    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`User updated: ${updatedUser.email}`);
    return updatedUser;
  }

  /**
   * Update password only
   */
  async updatePassword(id: number, hashedPassword: string): Promise<void> {
    const user = await this.findByIdOrFail(id);
    user.password = hashedPassword;
    await this.userRepository.save(user);
    this.logger.log(`Password updated for user: ${id}`);
  }

  /**
   * Change a user's email address.
   */
  async changeEmail(id: number, newEmail: string, password: string): Promise<User> {
    if (!newEmail) {
      throw new BadRequestException('New email is required');
    }

    const user = await this.findByIdWithPassword(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    if (newEmail === user.email) {
      throw new BadRequestException('New email must be different from current email');
    }

    const existingUser = await this.findByEmail(newEmail);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    user.email = newEmail;
    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`Email changed for user ${id}: ${updatedUser.email}`);
    return updatedUser;
  }

  /**
   * Update user's email verification code
   */
  async updateVerificationCode(email: string, code: string, expiry: Date): Promise<User> {
    const user = await this.findByEmailOrFail(email);
    user.verificationCode = code;
    user.verificationCodeExpiry = expiry;
    return this.userRepository.save(user);
  }

  /**
   * Verify a user's email
   */
  async verifyUser(email: string, code: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email, verificationCode: code },
    });

    if (!user) {
      throw new NotFoundException('Invalid verification code');
    }
    if (user.verificationCodeExpiry && user.verificationCodeExpiry < new Date()) {
      throw new NotFoundException('Verification code expired');
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiry = null;
    return this.userRepository.save(user);
  }

  /**
   * Update password reset code
   */
  async updateResetCode(email: string, code: string, expiry: Date): Promise<User> {
    const user = await this.findByEmailOrFail(email);
    user.resetCode = code;
    user.resetCodeExpiry = expiry;
    return this.userRepository.save(user);
  }

  /**
   * Verify password reset code
   */
  async verifyResetCode(email: string, code: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email, resetCode: code },
    });

    if (!user) {
      throw new NotFoundException('Invalid reset code');
    }
    if (user.resetCodeExpiry && user.resetCodeExpiry < new Date()) {
      throw new NotFoundException('Reset code expired');
    }

    return user;
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(email: string, tokenHash: string, expiry: Date): Promise<void> {
    const user = await this.findByEmailOrFail(email);
    user.resetTokenHash = tokenHash;
    user.resetTokenExpiry = expiry;
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await this.userRepository.save(user);
  }

  /**
   * Reset password
   */
  async resetPassword(email: string, hashedPassword: string): Promise<void> {
    const user = await this.findByEmailOrFail(email);
    user.password = hashedPassword;
    user.resetTokenHash = null;
    user.resetTokenExpiry = null;
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await this.userRepository.save(user);
  }

  /**
   * Approve a vendor
   */
  async approveVendor(vendorId: number): Promise<User> {
    const vendor = await this.findByIdOrFail(vendorId);

    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }

    if (vendor.isVendorApproved) {
      throw new BadRequestException('Vendor is already approved');
    }

    vendor.isVendorApproved = true;
    vendor.isVendorRejected = false;
    vendor.vendorRejectionReason = null; // ✅ use null consistently
    const updatedVendor = await this.userRepository.save(vendor);
    this.logger.log(`Vendor approved: ${vendor.email}`);
    return updatedVendor;
  }

  /**
   * Reject a vendor application
   */
  async rejectVendor(vendorId: number, reason?: string): Promise<User> {
    const vendor = await this.findByIdOrFail(vendorId);

    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }

    if (vendor.isVendorApproved) {
      throw new BadRequestException('Cannot reject an already-approved vendor');
    }

    vendor.isVendorRejected = true;
    vendor.isVendorApproved = false;
    vendor.vendorRejectionReason = reason || null; // ✅ use null
    const updatedVendor = await this.userRepository.save(vendor);
    this.logger.log(`Vendor rejected: ${vendor.email}`);
    return updatedVendor;
  }

  // ============================================================
  // DELETE METHODS
  // ============================================================

  /**
   * Soft delete a user
   */
  async delete(id: number): Promise<void> {
    const user = await this.findByIdOrFail(id);
    await this.userRepository.softRemove(user);
    this.logger.log(`User ${user.email} deleted successfully`);
  }

  /**
   * Permanently delete a user (hard delete)
   */
  async permanentlyDelete(id: number): Promise<void> {
    const user = await this.findByIdOrFail(id);
    await this.userRepository.remove(user);
    this.logger.log(`User ${user.email} permanently deleted`);
  }

  /**
   * Restore a soft-deleted user
   */
  async restore(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (!user.deletedAt) {
      throw new BadRequestException('User is not deleted');
    }

    await this.userRepository.recover(user);
    this.logger.log(`User ${user.email} restored`);
    return user;
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Generate a 6-digit verification code
   */
  generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Check if email is available
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return !user;
  }

  /**
   * Get user's public profile (excludes sensitive data)
   */
  getPublicProfile(user: User): Partial<User> {
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

  /**
   * Get multiple users by IDs
   */
  async findByIds(ids: number[]): Promise<User[]> {
    if (!ids || ids.length === 0) return [];
    return this.userRepository.find({
      where: ids.map((id) => ({ id })),
      select: ['id', 'name', 'email', 'role'],
    });
  }

  /**
   * Search users by name or email
   */
  async searchUsers(query: string): Promise<User[]> {
    if (!query || query.length < 2) return [];

    return this.userRepository
      .createQueryBuilder('user')
      .where('user.name ILIKE :query', { query: `%${query}%` })
      .orWhere('user.email ILIKE :query', { query: `%${query}%` })
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.role',
        'user.isVerified',
        'user.isVendorApproved',
      ])
      .limit(20)
      .getMany();
  }

  /**
   * Get recently registered users
   */
  async getRecentUsers(limit: number = 10): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      select: [
        'id',
        'name',
        'email',
        'role',
        'isVerified',
        'isVendorApproved',
        'createdAt',
      ],
    });
  }

  /**
   * Get users by date range
   */
  async getUsersByDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.role',
        'user.createdAt',
      ])
      .getMany();
  }

  /**
   * Get vendor dashboard statistics (placeholder)
   */
  async getVendorDashboardStats(vendorId: number): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
  }> {
    // This is a placeholder; actual implementation would use other services.
    return {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
    };
  }
}