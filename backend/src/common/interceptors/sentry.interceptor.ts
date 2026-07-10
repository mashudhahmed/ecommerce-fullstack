// src/common/interceptors/sentry.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        Sentry.withScope((scope) => {
          scope.setTag('method', request.method);
          scope.setTag('path', request.url);
          scope.setTag('ip', request.ip);
          if (user) {
            scope.setUser({ id: user.sub, email: user.email });
          }
          Sentry.captureException(error);
        });

        return throwError(() => error);
      }),
    );
  }
}