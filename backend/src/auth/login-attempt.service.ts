// src/auth/login-attempt.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { LoginAttempt } from './login-attempt.entity';

@Injectable()
export class LoginAttemptService {
  private readonly logger = new Logger(LoginAttemptService.name);
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_MINUTES = 15;

  constructor(
    @InjectRepository(LoginAttempt)
    private readonly attemptRepo: Repository<LoginAttempt>,
  ) {}

  async recordAttempt(
    email: string,
    ipAddress: string,
    isSuccessful: boolean,
    userAgent?: string,
  ): Promise<void> {
    const attempt = this.attemptRepo.create({
      email: email.toLowerCase().trim(),
      ipAddress,
      userAgent,
      isSuccessful,
    });
    await this.attemptRepo.save(attempt);
  }

  async isAccountLocked(email: string, ipAddress: string): Promise<boolean> {
    const cutoffTime = new Date(Date.now() - this.LOCKOUT_MINUTES * 60 * 1000);
    const emailNormalized = email.toLowerCase().trim();

    // Count recent failures for this email OR IP
    const recentFailures = await this.attemptRepo.count({
      where: [
        {
          email: emailNormalized,
          isSuccessful: false,
          createdAt: MoreThan(cutoffTime),
        },
        {
          ipAddress,
          isSuccessful: false,
          createdAt: MoreThan(cutoffTime),
        },
      ],
    });

    return recentFailures >= this.MAX_ATTEMPTS;
  }

  async getLockoutRemainingMinutes(email: string, ipAddress: string): Promise<number> {
    const cutoffTime = new Date(Date.now() - this.LOCKOUT_MINUTES * 60 * 1000);
    const emailNormalized = email.toLowerCase().trim();

    const latestAttempt = await this.attemptRepo.findOne({
      where: [
        {
          email: emailNormalized,
          isSuccessful: false,
          createdAt: MoreThan(cutoffTime),
        },
        {
          ipAddress,
          isSuccessful: false,
          createdAt: MoreThan(cutoffTime),
        },
      ],
      order: { createdAt: 'DESC' },
    });

    if (!latestAttempt) return 0;

    const elapsed = (Date.now() - latestAttempt.createdAt.getTime()) / 1000 / 60;
    return Math.max(0, Math.ceil(this.LOCKOUT_MINUTES - elapsed));
  }

  async clearAttempts(email: string, ipAddress: string): Promise<void> {
    const emailNormalized = email.toLowerCase().trim();
    await this.attemptRepo.delete([
      { email: emailNormalized },
      { ipAddress },
    ]);
  }

  async cleanupOldAttempts(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.attemptRepo.delete({
      createdAt: LessThan(thirtyDaysAgo),
    });
  }

  async getAttemptStats(email: string): Promise<{
    totalAttempts: number;
    failedAttempts: number;
    successfulAttempts: number;
    lastAttemptAt: Date | null;
  }> {
    const emailNormalized = email.toLowerCase().trim();
    const [total, failed, successful, lastAttempt] = await Promise.all([
      this.attemptRepo.count({ where: { email: emailNormalized } }),
      this.attemptRepo.count({
        where: { email: emailNormalized, isSuccessful: false },
      }),
      this.attemptRepo.count({
        where: { email: emailNormalized, isSuccessful: true },
      }),
      this.attemptRepo.findOne({
        where: { email: emailNormalized },
        order: { createdAt: 'DESC' },
        select: ['createdAt'],
      }),
    ]);

    return {
      totalAttempts: total,
      failedAttempts: failed,
      successfulAttempts: successful,
      lastAttemptAt: lastAttempt?.createdAt || null,
    };
  }
}