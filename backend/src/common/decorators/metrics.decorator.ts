// src/common/decorators/metrics.decorator.ts
import { MetricsService } from '../../monitoring/metrics.service';

export function TrackDbQuery(entity: string, operation: string): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const metricsService = (this as any).metricsService as MetricsService;
      
      try {
        const result = await originalMethod.apply(this, args);
        if (metricsService) {
          const duration = (Date.now() - startTime) / 1000;
          metricsService.recordDbQuery(operation, entity, duration);
        }
        return result;
      } catch (error) {
        if (metricsService) {
          const duration = (Date.now() - startTime) / 1000;
          metricsService.recordDbQuery(operation, entity, duration);
        }
        throw error;
      }
    };

    return descriptor;
  };
}