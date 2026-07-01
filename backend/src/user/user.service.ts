// user/user.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

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

  async findByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    return this.userRepository.findOne({ where: { email } });
  }

  // ✅ Explicit opt-in for password hash (used only by login)
  async findByEmailWithPassword(email: string): Promise<User | null> {
    if (!email) return null;
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: number): Promise<User | null> {
    if (!id) return null;
    return this.userRepository.findOne({ where: { id } });
  }

  // ✅ Explicit opt-in for password hash (used by change password)
  async findByIdWithPassword(id: number): Promise<User | null> {
    if (!id) return null;
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findByIdOrFail(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmailOrFail(email: string): Promise<User> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async findByResetTokenHash(tokenHash: string): Promise<User | null> {
    if (!tokenHash) return null;
    return this.userRepository.findOne({
      where: { resetTokenHash: tokenHash },
    });
  }

  // ============================================================
  // CREATE
  // ============================================================

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

    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async update(id: number, updateData: Partial<User>): Promise<User> {
    const user = await this.findByIdOrFail(id);

    // ✅ If password is being updated, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, BCRYPT_ROUNDS);
    }

    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  // ✅ Update password only (used by change password flow)
  async updatePassword(id: number, hashedPassword: string): Promise<void> {
    const user = await this.findByIdOrFail(id);
    user.password = hashedPassword;
    await this.userRepository.save(user);
    this.logger.log(`Password updated for user: ${id}`);
  }

  // ============================================================
  // DELETE
  // ============================================================

  async delete(id: number): Promise<void> {
    const user = await this.findByIdOrFail(id);
    await this.userRepository.remove(user);
    this.logger.log(`User ${user.email} deleted successfully`);
  }

  // ============================================================
  // LIST
  // ============================================================

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'name', 'email', 'role', 'isVerified', 'createdAt'],
    });
  }

  // ============================================================
  // GENERATE CODE
  // ============================================================

  generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ============================================================
  // EMAIL VERIFICATION
  // ============================================================

  async updateVerificationCode(email: string, code: string, expiry: Date): Promise<User> {
    const user = await this.findByEmailOrFail(email);
    user.verificationCode = code;
    user.verificationCodeExpiry = expiry;
    return this.userRepository.save(user);
  }

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

  // ============================================================
  // PASSWORD RESET
  // ============================================================

  async updateResetCode(email: string, code: string, expiry: Date): Promise<User> {
    const user = await this.findByEmailOrFail(email);
    user.resetCode = code;
    user.resetCodeExpiry = expiry;
    return this.userRepository.save(user);
  }

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

  async setPasswordResetToken(email: string, tokenHash: string, expiry: Date): Promise<void> {
    const user = await this.findByEmailOrFail(email);
    user.resetTokenHash = tokenHash;
    user.resetTokenExpiry = expiry;
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await this.userRepository.save(user);
  }

  async resetPassword(email: string, hashedPassword: string): Promise<void> {
    const user = await this.findByEmailOrFail(email);
    user.password = hashedPassword;
    user.resetTokenHash = null;
    user.resetTokenExpiry = null;
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await this.userRepository.save(user);
  }
}