// src/orders/dto/order-history.dto.ts
import { IsOptional, IsEnum, IsString, IsNumber, Min, Max } from 'class-validator';
import { OrderStatus } from '../order.entity';

export class OrderHistoryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'total' | 'status' = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}