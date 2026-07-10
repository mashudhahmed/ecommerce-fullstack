// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { DatabaseHealthIndicator } from './database.health';
import { RedisHealthIndicator } from './redis.health';
import * as os from 'os';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private databaseHealth: DatabaseHealthIndicator,
    private redisHealth: RedisHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check overall system health' })
  async check() {
    const checks: any[] = [
      () => this.db.pingCheck('database', { timeout: 5000 }),
      () =>
        this.disk.checkStorage('disk', {
          thresholdPercent: 0.9,
          path: '/',
        }),
      () => this.memory.checkHeap('memory_heap', 1500 * 1024 * 1024),
      () => this.databaseHealth.isHealthy('database_custom'),
    ];

    const redisUrl = this.configService.get('redis.url');
    if (redisUrl) {
      checks.push(() => this.redisHealth.isHealthy('redis'));
    }

    const result = await this.health.check(checks);
    
    // Add system info
    return {
      ...result,
      system: {
        uptime: process.uptime(),
        startTime: new Date(this.startTime).toISOString(),
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
        hostname: os.hostname(),
      },
      process: {
        pid: process.pid,
        env: process.env.NODE_ENV || 'development',
        memoryUsage: process.memoryUsage(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('liveness')
  @HealthCheck()
  async liveness() {
    const checks: any[] = [
      () => this.db.pingCheck('database', { timeout: 3000 }),
    ];

    const redisUrl = this.configService.get('redis.url');
    if (redisUrl) {
      checks.push(() => this.redisHealth.isHealthy('redis'));
    }

    const result = await this.health.check(checks);
    return {
      ...result,
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @HealthCheck()
  async readiness() {
    const checks: any[] = [
      () => this.db.pingCheck('database', { timeout: 3000 }),
    ];

    const redisUrl = this.configService.get('redis.url');
    if (redisUrl) {
      checks.push(() => this.redisHealth.isHealthy('redis'));
    }

    const result = await this.health.check(checks);
    return {
      ...result,
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Get detailed health information' })
  async detailed() {
    const [database, disk, memory] = await Promise.all([
      this.databaseHealth.isHealthy('database').catch(() => null),
      this.disk.checkStorage('disk', { thresholdPercent: 0.9, path: '/' }).catch(() => null),
      this.memory.checkHeap('memory_heap', 1500 * 1024 * 1024).catch(() => null),
    ]);

    const redisUrl = this.configService.get('redis.url');
    let redis = null;
    if (redisUrl) {
      redis = await this.redisHealth.isHealthy('redis').catch(() => null);
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        database: database ? 'healthy' : 'unhealthy',
        redis: redis ? 'healthy' : 'disabled',
        disk: disk ? 'healthy' : 'unhealthy',
        memory: memory ? 'healthy' : 'unhealthy',
      },
      system: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        memoryUsage: process.memoryUsage(),
        loadAverage: os.loadavg(),
        hostname: os.hostname(),
        pid: process.pid,
      },
    };
  }
}