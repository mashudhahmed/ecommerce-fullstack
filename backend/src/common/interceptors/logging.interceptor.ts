// src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('API');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const requestId = uuidv4();
    const startTime = Date.now();

    // Add request ID to request object for use in services
    request.requestId = requestId;

    // Log request
    this.logger.log({
      type: 'request',
      requestId,
      method,
      url,
      ip,
      userAgent,
      userId: request.user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const status = context.switchToHttp().getResponse().statusCode;

          this.logger.log({
            type: 'response',
            requestId,
            method,
            url,
            status,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          });

          // Log slow requests
          if (duration > 1000) {
            this.logger.warn({
              type: 'slow_request',
              requestId,
              method,
              url,
              duration: `${duration}ms`,
              timestamp: new Date().toISOString(),
            });
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error({
            type: 'error',
            requestId,
            method,
            url,
            status: error.status || 500,
            message: error.message,
            stack: error.stack,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }
}