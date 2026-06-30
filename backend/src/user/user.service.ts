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

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    if (!email) {
      return null;
    }
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    if (!id) {
      return null;
    }
    return this.userRepository.findOne({ where: { id } });
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

  async findByResetCode(resetCode: string): Promise<User | null> {
    if (!resetCode) {
      return null;
    }
    return this.userRepository.findOne({
      where: { resetCode },
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    // Validate required fields
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

  async update(id: number, updateData: Partial<User>): Promise<User> {
    const user = await this.findByIdOrFail(id);

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async delete(id: number): Promise<void> {
    const user = await this.findByIdOrFail(id);
    await this.userRepository.remove(user);
    this.logger.log(`User ${user.email} deleted successfully`);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'name', 'email', 'role', 'isVerified', 'createdAt'],
    });
  }

  async updateVerificationCode(
    email: string,
    code: string,
    expiry: Date,
  ): Promise<User> {
    const user = await this.findByEmailOrFail(email);
    user.verificationCode = code;
    user.verificationCodeExpiry = expiry;
    return this.userRepository.save(user);
  }

  async verifyUser(email: string, code: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: {
        email,
        verificationCode: code,
      },
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

  async updateResetCode(
    email: string,
    code: string,
    expiry: Date,
  ): Promise<User> {
    const user = await this.findByEmailOrFail(email);
    user.resetCode = code;
    user.resetCodeExpiry = expiry;
    return this.userRepository.save(user);
  }

  async verifyResetCode(email: string, code: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: {
        email,
        resetCode: code,
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid reset code');
    }

    if (user.resetCodeExpiry && user.resetCodeExpiry < new Date()) {
      throw new NotFoundException('Reset code expired');
    }

    return user;
  }

  async resetPassword(email: string, newPassword: string): Promise<void> {
    const user = await this.findByEmailOrFail(email);
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await this.userRepository.save(user);
  }

  generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}