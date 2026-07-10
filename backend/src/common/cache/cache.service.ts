// src/common/cache/cache.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis | null) {}

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Cache get error: ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Cache set error: ${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache del error: ${error.message}`);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.redis) return;
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Cache invalidate pattern error: ${error.message}`);
    }
  }
}