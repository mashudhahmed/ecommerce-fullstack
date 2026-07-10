// src/common/interceptors/query-timeout.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { QUERY_TIMEOUT } from '../decorators/query-timeout.decorator';

@Injectable()
export class QueryTimeoutInterceptor implements NestInterceptor {
  private readonly defaultTimeout = 30000;

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const timeoutMs =
      this.reflector.get<number>(QUERY_TIMEOUT, context.getHandler()) ||
      this.defaultTimeout;

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err) => {
        if (err.name === 'TimeoutError') {
          return throwError(
            () =>
              new RequestTimeoutException(
                `Query timed out after ${timeoutMs}ms`
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}