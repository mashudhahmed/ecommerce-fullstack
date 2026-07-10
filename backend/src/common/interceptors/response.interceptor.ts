// src/common/interceptors/response.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

/**
 * Standard API response format
 */
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
  meta?: {
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    [key: string]: any;
  };
}

/**
 * Check if a response is paginated
 */
function isPaginatedResponse(data: any): boolean {
  return (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    'meta' in data &&
    data.meta &&
    typeof data.meta === 'object' &&
    'total' in data.meta &&
    'page' in data.meta &&
    'limit' in data.meta
  );
}

/**
 * Check if response is already formatted (by a previous interceptor)
 */
function isAlreadyFormatted(data: any): boolean {
  return (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    'statusCode' in data &&
    'data' in data
  );
}

/**
 * Response Interceptor – wraps all successful responses in a consistent format
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Get status code (default to 200 if not set)
    const statusCode = response.statusCode || HttpStatus.OK;

    // Get custom message from metadata (optional)
    const customMessage = this.reflector.get<string>(
      'responseMessage',
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data) => {
        // If response is already formatted (by another interceptor), return as-is
        if (isAlreadyFormatted(data)) {
          return data;
        }

        // Handle paginated responses
        if (isPaginatedResponse(data)) {
          return this.formatPaginatedResponse(data, statusCode, request.url, customMessage);
        }

        // Handle array responses
        if (Array.isArray(data)) {
          return this.formatResponse(data, statusCode, request.url, customMessage);
        }

        // Handle single object or primitive responses
        return this.formatResponse(data, statusCode, request.url, customMessage);
      }),
    );
  }

  /**
   * Format a standard response
   */
  private formatResponse<T>(
    data: T,
    statusCode: number,
    path: string,
    customMessage?: string,
  ): ApiResponse<T> {
    return {
      success: true,
      statusCode,
      message: customMessage || this.getDefaultMessage(statusCode),
      data,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  /**
   * Format a paginated response with enhanced metadata
   */
  private formatPaginatedResponse<T>(
    data: { data: T[]; meta: any },
    statusCode: number,
    path: string,
    customMessage?: string,
  ): ApiResponse<T[]> {
    const { data: items, meta } = data;

    // Build pagination metadata
    const paginationMeta = {
      total: meta.total || 0,
      page: meta.page || 1,
      limit: meta.limit || 20,
      totalPages: meta.totalPages || Math.ceil((meta.total || 0) / (meta.limit || 20)),
      hasNextPage: meta.hasNextPage !== undefined ? meta.hasNextPage : (meta.page || 1) < Math.ceil((meta.total || 0) / (meta.limit || 20)),
      hasPreviousPage: meta.hasPreviousPage !== undefined ? meta.hasPreviousPage : (meta.page || 1) > 1,
    };

    // Copy any additional meta fields (like stats, distribution, etc.)
    const additionalMeta: Record<string, any> = {};
    const reservedKeys = ['total', 'page', 'limit', 'totalPages', 'hasNextPage', 'hasPreviousPage'];
    for (const key of Object.keys(meta)) {
      if (!reservedKeys.includes(key)) {
        additionalMeta[key] = meta[key];
      }
    }

    return {
      success: true,
      statusCode,
      message: customMessage || this.getDefaultMessage(statusCode),
      data: items,
      timestamp: new Date().toISOString(),
      path,
      meta: {
        pagination: paginationMeta,
        ...additionalMeta,
      },
    };
  }

  /**
   * Get default message based on status code
   * Only standard status codes are used; others fall back to a generic message.
   */
  private getDefaultMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      [HttpStatus.OK]: 'Request successful',
      [HttpStatus.CREATED]: 'Resource created successfully',
      [HttpStatus.ACCEPTED]: 'Request accepted',
      [HttpStatus.NON_AUTHORITATIVE_INFORMATION]: 'Request processed successfully',
      [HttpStatus.NO_CONTENT]: 'No content',
      [HttpStatus.RESET_CONTENT]: 'Reset content',
      [HttpStatus.PARTIAL_CONTENT]: 'Partial content',
    };

    return messages[statusCode] || 'Request successful';
  }
}

/**
 * Custom decorator to set response message
 * Example: @ResponseMessage('User created successfully')
 */
export const ResponseMessage = (message: string) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('responseMessage', message, descriptor.value);
  };
};

/**
 * Custom decorator to skip response formatting
 * Example: @SkipResponseFormatting()
 */
export const SkipResponseFormatting = () => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('skipResponseFormatting', true, descriptor.value);
  };
};