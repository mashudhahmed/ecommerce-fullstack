// src/common/decorators/api.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';

// Define as a class for Swagger
export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function ApiPaginatedResponse<T extends Type<unknown>>(model: T) {
  return applyDecorators(
    ApiExtraModels(PaginatedResponseDto, model),
    ApiResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
}

export function ApiStandardResponse<T extends Type<unknown>>(model?: T) {
  const decorators = [
    ApiResponse({
      status: 200,
      description: 'Success',
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: { type: 'string', example: 'Request successful' },
          data: model ? { $ref: getSchemaPath(model) } : { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string' },
        },
      },
    }),
  ];

  if (model) {
    decorators.push(ApiExtraModels(model));
  }

  return applyDecorators(...decorators);
}

export function ApiErrorResponse(status: number, description: string) {
  return applyDecorators(
    ApiResponse({
      status,
      description,
      schema: {
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: status },
          message: { type: 'string', example: description },
          error: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string' },
        },
      },
    }),
  );
}