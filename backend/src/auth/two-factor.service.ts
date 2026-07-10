// src/auth/two-factor.service.ts
import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwoFactor, TwoFactorMethod } from './two-factor.entity';
import { User } from '../user/user.entity';
import { MailerService } from '../mailer/mailer.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    @InjectRepository(TwoFactor)
    private readonly twoFactorRepo: Repository<TwoFactor>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailerService: MailerService,
  ) {}

  async generateSecret(userId: number): Promise<{ secret: string; qrCode: string; otpauthUrl: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const existing = await this.twoFactorRepo.findOne({ where: { userId, isEnabled: true } });
    if (existing) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = speakeasy.generateSecret({
      name: `SnapCart:${user.email}`,
      length: 20,
    });

    if (!secret.otpauth_url) {
      throw new BadRequestException('Failed to generate 2FA secret');
    }

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    let twoFactor = await this.twoFactorRepo.findOne({ where: { userId } });
    if (!twoFactor) {
      twoFactor = this.twoFactorRepo.create({
        userId,
        secret: secret.base32,
        method: TwoFactorMethod.EMAIL,
        backupCodes: [],
        isEnabled: false,
      });
    } else {
      twoFactor.secret = secret.base32;
      twoFactor.method = TwoFactorMethod.EMAIL;
      twoFactor.isEnabled = false;
    }
    await this.twoFactorRepo.save(twoFactor);

    return {
      secret: secret.base32,
      qrCode,
      otpauthUrl: secret.otpauth_url,
    };
  }

  async sendTwoFactorCode(userId: number): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    let twoFactor = await this.twoFactorRepo.findOne({ where: { userId } });

    if (!twoFactor) {
      twoFactor = this.twoFactorRepo.create({
        userId,
        isEnabled: true,
        method: TwoFactorMethod.EMAIL,
        backupCodes: [],
      });
      await this.twoFactorRepo.save(twoFactor);
    }

    if (!twoFactor.isEnabled) {
      twoFactor.isEnabled = true;
      twoFactor.method = TwoFactorMethod.EMAIL;
      await this.twoFactorRepo.save(twoFactor);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    twoFactor.tempCode = code;
    twoFactor.tempCodeExpiry = expiry;
    await this.twoFactorRepo.save(twoFactor);

    await this.mailerService.sendTwoFactorCode(user.email, code, user.name);

    this.logger.log(`2FA code sent to ${user.email}`);
    return { message: '2FA code sent to your email' };
  }

  async verifyEmailOTP(userId: number, code: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepo.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactor) {
      throw new BadRequestException('2FA not configured');
    }

    if (!twoFactor.tempCode || !twoFactor.tempCodeExpiry) {
      throw new BadRequestException('No 2FA code requested. Please request a new code.');
    }

    if (twoFactor.tempCodeExpiry < new Date()) {
      throw new BadRequestException('2FA code expired. Please request a new one.');
    }

    if (twoFactor.tempCode !== code) {
      throw new UnauthorizedException('Invalid 2FA code. Please try again.');
    }

    twoFactor.tempCode = null;
    twoFactor.tempCodeExpiry = null;
    await this.twoFactorRepo.save(twoFactor);

    return true;
  }

  async verifyToken(userId: number, token: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepo.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactor) {
      throw new BadRequestException('2FA not configured');
    }

    if (twoFactor.backupCodes && twoFactor.backupCodes.includes(token)) {
      twoFactor.backupCodes = twoFactor.backupCodes.filter((code) => code !== token);
      await this.twoFactorRepo.save(twoFactor);
      return true;
    }

    if (twoFactor.tempCode && twoFactor.tempCode === token && twoFactor.tempCodeExpiry && twoFactor.tempCodeExpiry > new Date()) {
      twoFactor.tempCode = null;
      twoFactor.tempCodeExpiry = null;
      await this.twoFactorRepo.save(twoFactor);
      return true;
    }

    if (!twoFactor.secret) {
      return false;
    }

    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    return verified;
  }

  async verifyAndEnable(userId: number, code: string): Promise<{ verified: boolean; backupCodes: string[] }> {
    const twoFactor = await this.twoFactorRepo.findOne({ where: { userId } });
    if (!twoFactor) {
      throw new BadRequestException('2FA not initialized');
    }
    if (twoFactor.isEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const valid = await this.verifyEmailOTP(userId, code);
    if (!valid) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    const backupCodes = Array.from({ length: 10 }, () => this.generateBackupCode());

    twoFactor.isEnabled = true;
    twoFactor.method = TwoFactorMethod.EMAIL;
    twoFactor.backupCodes = backupCodes;
    twoFactor.verifiedAt = new Date();
    twoFactor.tempCode = null;
    twoFactor.tempCodeExpiry = null;
    await this.twoFactorRepo.save(twoFactor);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      await this.mailerService.sendTwoFactorBackupCodes(user.email, backupCodes, user.name);
    }

    return { verified: true, backupCodes };
  }

  async disable(userId: number, code: string): Promise<void> {
    const twoFactor = await this.twoFactorRepo.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactor) {
      throw new BadRequestException('2FA not enabled');
    }

    const valid = await this.verifyEmailOTP(userId, code);
    if (!valid) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    twoFactor.isEnabled = false;
    twoFactor.secret = null;
    twoFactor.backupCodes = [];
    twoFactor.tempCode = null;
    twoFactor.tempCodeExpiry = null;
    twoFactor.verifiedAt = null;
    await this.twoFactorRepo.save(twoFactor);

    this.logger.log(`2FA disabled for user ${userId}`);
  }

  async generateBackupCodes(userId: number): Promise<string[]> {
    const twoFactor = await this.twoFactorRepo.findOne({ where: { userId, isEnabled: true } });
    if (!twoFactor) {
      throw new BadRequestException('2FA not enabled');
    }

    const backupCodes = Array.from({ length: 10 }, () => this.generateBackupCode());
    twoFactor.backupCodes = backupCodes;
    await this.twoFactorRepo.save(twoFactor);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      await this.mailerService.sendTwoFactorBackupCodes(user.email, backupCodes, user.name);
    }

    return backupCodes;
  }

  private generateBackupCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let code = '';
    for (let i = 0; i < 16; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i % 4 === 3 && i < 15) code += '-';
    }
    return code;
  }
}