// src/health/database.health.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.dataSource.query('SELECT 1');
      
      const stats = await this.dataSource.query(`
        SELECT 
          (SELECT count(*) FROM users) as user_count,
          (SELECT count(*) FROM products) as product_count,
          (SELECT count(*) FROM orders) as order_count
      `);

      return this.getStatus(key, true, {
        ...stats[0],
        connection: 'active',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.getStatus(key, false, {
        error: message,
        connection: 'inactive',
      });
    }
  }
}