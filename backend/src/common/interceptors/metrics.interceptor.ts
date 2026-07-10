// src/common/interceptors/metrics.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../monitoring/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Track active connections
    this.metricsService.recordActiveConnection(true);

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = (Date.now() - startTime) / 1000;
          const route = request.route?.path || request.path;

          this.metricsService.recordHttpRequest(
            request.method,
            route,
            response.statusCode,
            duration,
          );

          this.metricsService.recordActiveConnection(false);
        },
        error: () => {
          const response = context.switchToHttp().getResponse();
          const duration = (Date.now() - startTime) / 1000;
          const route = request.route?.path || request.path;

          this.metricsService.recordHttpRequest(
            request.method,
            route,
            response?.statusCode || 500,
            duration,
          );

          this.metricsService.recordActiveConnection(false);
        },
      }),
    );
  }
}