// src/common/decorators/tracing.decorator.ts
import { Logger } from '@nestjs/common';

export function Trace(name: string): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const logger = new Logger(`Trace:${target.constructor.name}`);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const className = target.constructor.name;
      
      logger.debug(`[${className}.${name}] Starting`);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        logger.debug(`[${className}.${name}] Completed in ${duration}ms`);
        return result;
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[${className}.${name}] Failed after ${duration}ms: ${errorMessage}`);
        throw error;
      }
    };

    return descriptor;
  };
}