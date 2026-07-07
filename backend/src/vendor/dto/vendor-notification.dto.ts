// src/vendor/dto/vendor-notification.dto.ts
import { IsOptional, IsNumber, IsBoolean, Min, Max, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class VendorNotificationFilterDto {
  @ApiProperty({ 
    example: 1,
    required: false,
    description: 'Page number'
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ 
    example: 20,
    required: false,
    description: 'Items per page'
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({ 
    example: false,
    required: false,
    description: 'Filter by read status'
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  read?: boolean;

  @ApiProperty({ 
    example: 'order',
    required: false,
    description: 'Filter by notification type'
  })
  @IsOptional()
  @IsString()
  type?: string;
}