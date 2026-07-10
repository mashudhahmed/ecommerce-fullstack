// src/monitoring/monitoring.module.ts
import { Global, Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MetricsService } from '../monitoring/metrics.service';

@Global() 
@Module({
  controllers: [MonitoringController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MonitoringModule {}