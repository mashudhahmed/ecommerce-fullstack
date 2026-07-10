// src/common/decorators/logger.decorator.ts
import { Logger } from '@nestjs/common';

export function LogMethod(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const logger = new Logger(`${target.constructor.name}:${String(propertyKey)}`);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const requestId = (this as any).requestId || 'unknown';
      
      logger.debug({
        type: 'method_entry',
        requestId,
        method: propertyKey,
        args: args.length,
        timestamp: new Date().toISOString(),
      });

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        logger.debug({
          type: 'method_exit',
          requestId,
          method: propertyKey,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });

        return result;
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({
          type: 'method_error',
          requestId,
          method: propertyKey,
          error: errorMessage,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    };

    return descriptor;
  };
}