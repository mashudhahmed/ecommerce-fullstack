// src/common/guards/user-rate-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserRateLimit } from '../entities/user-rate-limit.entity';

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  private readonly maxRequests = 30; // Requests per minute
  private readonly windowMs = 60000; // 1 minute

  constructor(
    @InjectRepository(UserRateLimit)
    private readonly rateLimitRepo: Repository<UserRateLimit>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip if no user (use IP-based rate limiting instead)
    if (!user || !user.sub) {
      return true;
    }

    const userId = user.sub;
    const endpoint = request.route?.path || request.path;
    const key = `${userId}:${endpoint}`;

    // Clean up expired entries
    await this.rateLimitRepo.delete({
      expiresAt: LessThan(new Date()),
    });

    // Get or create rate limit entry
    let entry = await this.rateLimitRepo.findOne({ where: { key } });
    const now = new Date();

    if (!entry) {
      entry = this.rateLimitRepo.create({
        key,
        userId,
        endpoint,
        count: 1,
        createdAt: now,
        expiresAt: new Date(now.getTime() + this.windowMs),
      });
      await this.rateLimitRepo.save(entry);
      return true;
    }

    // Check if expired
    if (entry.expiresAt < now) {
      entry.count = 1;
      entry.createdAt = now;
      entry.expiresAt = new Date(now.getTime() + this.windowMs);
      await this.rateLimitRepo.save(entry);
      return true;
    }

    // Check limit
    if (entry.count >= this.maxRequests) {
      const retryAfter = Math.ceil((entry.expiresAt.getTime() - now.getTime()) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many requests for this endpoint. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment count
    entry.count += 1;
    await this.rateLimitRepo.save(entry);

    return true;
  }
}