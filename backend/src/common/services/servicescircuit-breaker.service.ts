// src/common/services/circuit-breaker.service.ts
import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import { ConfigService } from '@nestjs/config';

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  name?: string;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers: Map<string, any> = new Map();

  constructor(private readonly configService: ConfigService) {}

  createBreaker(
    name: string,
    fn: (...args: any[]) => Promise<any>,
    options: CircuitBreakerOptions = {},
  ): any {
    const defaultOptions: CircuitBreakerOptions = {
      timeout: this.configService.get('circuitBreaker.timeout', 30000),
      errorThresholdPercentage: this.configService.get(
        'circuitBreaker.errorThreshold',
        50,
      ),
      resetTimeout: this.configService.get('circuitBreaker.resetTimeout', 30000),
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
    };

    const breakerOptions = { ...defaultOptions, ...options };
    const breaker = new CircuitBreaker(fn, breakerOptions as any);

    breaker.on('open', () => {
      this.logger.warn(`Circuit breaker '${name}' opened`);
    });

    breaker.on('halfOpen', () => {
      this.logger.log(`Circuit breaker '${name}' half-open`);
    });

    breaker.on('close', () => {
      this.logger.log(`Circuit breaker '${name}' closed`);
    });

    breaker.on('fallback', (result: any) => {
      this.logger.warn(`Circuit breaker '${name}' fallback executed`);
    });

    breaker.on('reject', () => {
      this.logger.warn(`Circuit breaker '${name}' rejected request`);
    });

    breaker.on('timeout', () => {
      this.logger.warn(`Circuit breaker '${name}' timed out`);
    });

    this.breakers.set(name, breaker);
    return breaker;
  }

  getBreaker(name: string): any {
    return this.breakers.get(name);
  }

  async execute<T>(
    name: string,
    fn: (...args: any[]) => Promise<T>,
    fallback?: () => T | Promise<T>,
  ): Promise<T> {
    let breaker = this.getBreaker(name);

    if (!breaker) {
      breaker = this.createBreaker(name, fn as any);
    }

    if (fallback) {
      breaker.fallback(fallback as any);
    }

    try {
      const result = await breaker.fire();
      return result as T;
    } catch (error: any) {
      this.logger.error(
        `Circuit breaker '${name}' execution failed: ${error.message}`,
      );
      throw error;
    }
  }

  getStatus(name: string): any {
    const breaker = this.getBreaker(name);
    if (!breaker) {
      return { status: 'not_found', name };
    }

    return {
      name,
      status: breaker.status,
      stats: breaker.stats,
      opened: breaker.opened,
      closed: breaker.closed,
    };
  }

  getAllStatus(): any[] {
    const result: any[] = [];
    for (const [name, breaker] of this.breakers) {
      result.push({
        name,
        status: breaker.status,
        stats: breaker.stats,
        opened: breaker.opened,
        closed: breaker.closed,
      });
    }
    return result;
  }

  reset(name: string): void {
    const breaker = this.getBreaker(name);
    if (breaker) {
      breaker.close();
      this.logger.log(`Circuit breaker '${name}' reset`);
    }
  }
}