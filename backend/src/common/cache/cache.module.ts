// src/common/cache/cache.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const url = configService.get('redis.url');
        if (!url) {
          return null;
        }
        return new Redis(url);
      },
      inject: [ConfigService],
    },
    CacheService,
  ],
  exports: ['REDIS_CLIENT', CacheService],
})
export class CacheModule {}