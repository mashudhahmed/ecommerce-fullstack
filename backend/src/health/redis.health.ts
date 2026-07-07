// src/health/redis.health.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private redis!: Redis;

  constructor(private configService: ConfigService) {
    super();
    
    const redisUrl = this.configService.get('redis.url');
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    }
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      if (!this.redis) {
        return this.getStatus(key, true, { 
          status: 'disabled',
          message: 'Redis is not configured',
        });
      }

      // Ping Redis
      const pong = await this.redis.ping();
      
      // Get Redis info
      const info = await this.redis.info();
      const parsedInfo = this.parseRedisInfo(info);

      return this.getStatus(key, true, {
        status: 'connected',
        ping: pong,
        ...parsedInfo,
      });
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      }

      return this.getStatus(key, false, {
        status: 'disconnected',
        error: message,
      });
    }
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\n');
    const result: any = {};

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key.trim()] = value.trim();
      }
    }

    return {
      redisVersion: result.redis_version,
      uptimeSeconds: parseInt(result.uptime_in_seconds),
      connectedClients: parseInt(result.connected_clients),
      usedMemory: result.used_memory_human,
      totalKeys: parseInt(result.db0?.split('=')[1] || '0'),
    };
  }
}