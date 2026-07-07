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

@ApiTags('Health')
@Controller('health')
export class HealthController {
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
  check() {
    const checks: any[] = [
      () => this.db.pingCheck('database', { timeout: 5000 }),
      () => this.disk.checkStorage('disk', { 
        thresholdPercent: 0.9,
        path: '/',
      }),
      () => this.memory.checkHeap('memory_heap', 1500 * 1024 * 1024),
      () => this.databaseHealth.isHealthy('database_custom'),
    ];

    // ✅ Only add Redis check if configured
    const redisUrl = this.configService.get('redis.url');
    if (redisUrl) {
      checks.push(() => this.redisHealth.isHealthy('redis'));
    }

    return this.health.check(checks);
  }

  @Get('liveness')
  @HealthCheck()
  liveness() {
    const checks: any[] = [
      () => this.db.pingCheck('database', { timeout: 3000 }),
    ];

    const redisUrl = this.configService.get('redis.url');
    if (redisUrl) {
      checks.push(() => this.redisHealth.isHealthy('redis'));
    }

    return this.health.check(checks);
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    const checks: any[] = [
      () => this.db.pingCheck('database', { timeout: 3000 }),
    ];

    const redisUrl = this.configService.get('redis.url');
    if (redisUrl) {
      checks.push(() => this.redisHealth.isHealthy('redis'));
    }

    return this.health.check(checks);
  }
}