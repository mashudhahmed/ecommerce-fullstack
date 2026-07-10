// src/common/interceptors/version.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { API_VERSION } from '../decorators/api-version.decorator';

@Injectable()
export class VersionInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requiredVersion = this.reflector.get<string>(
      API_VERSION,
      context.getHandler(),
    );

    if (!requiredVersion) {
      return next.handle();
    }

    const acceptVersion = request.headers['accept-version'];
    if (!acceptVersion) {
      throw new BadRequestException('API version header (Accept-Version) is required');
    }

    if (acceptVersion !== requiredVersion) {
      throw new BadRequestException(
        `API version ${requiredVersion} is required. You provided ${acceptVersion}`,
      );
    }

    return next.handle();
  }
}