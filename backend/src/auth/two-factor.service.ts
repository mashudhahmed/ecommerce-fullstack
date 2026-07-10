// src/auth/two-factor.service.ts
import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwoFactor, TwoFactorMethod } from './two-factor.entity';
import { User } from '../user/user.entity';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { MailerService } from '../mailer/mailer.service';

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
        method: TwoFactorMethod.AUTHENTICATOR,
      });
    } else {
      twoFactor.secret = secret.base32;
    }
    await this.twoFactorRepo.save(twoFactor);

    return {
      secret: secret.base32,
      qrCode,
      otpauthUrl: secret.otpauth_url,
    };
  }

  async verifyAndEnable(userId: number, token: string): Promise<{ verified: boolean; backupCodes: string[] }> {
    const twoFactor = await this.twoFactorRepo.findOne({ where: { userId } });
    if (!twoFactor || !twoFactor.secret) {
      throw new BadRequestException('2FA not initialized');
    }
    if (twoFactor.isEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid TOTP token');
    }

    const backupCodes = Array.from({ length: 10 }, () => this.generateBackupCode());

    twoFactor.isEnabled = true;
    twoFactor.backupCodes = backupCodes;
    twoFactor.verifiedAt = new Date();
    await this.twoFactorRepo.save(twoFactor);

    return { verified: true, backupCodes };
  }

  async verifyToken(userId: number, token: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepo.findOne({ where: { userId, isEnabled: true } });
    if (!twoFactor || !twoFactor.secret) {
      throw new BadRequestException('2FA not configured');
    }

    // Check backup codes first
    if (twoFactor.backupCodes.includes(token)) {
      twoFactor.backupCodes = twoFactor.backupCodes.filter((code) => code !== token);
      await this.twoFactorRepo.save(twoFactor);
      return true;
    }

    // Verify TOTP
    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    return verified;
  }

  // ✅ FIX 1: Type 'null' is not assignable to type 'string'
  // Change secret type to allow null
  async disable(userId: number, token: string): Promise<void> {
    const twoFactor = await this.twoFactorRepo.findOne({ 
      where: { userId, isEnabled: true } 
    });
    
    if (!twoFactor) {
      throw new BadRequestException('2FA not enabled');
    }
    
    if (!twoFactor.secret) {
      throw new BadRequestException('2FA secret not found');
    }

    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid TOTP token');
    }

    // ✅ FIX: Use undefined instead of null for optional fields
    // Or update the entity to allow null
    twoFactor.isEnabled = false;
    twoFactor.secret = undefined;  // ✅ Changed from null to undefined
    twoFactor.backupCodes = [];
    twoFactor.verifiedAt = undefined;  // ✅ Changed from null to undefined
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