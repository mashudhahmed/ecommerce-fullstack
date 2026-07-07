// src/vendor/dto/vendor-review.dto.ts
import { IsOptional, IsNumber, IsString, Min, Max, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class VendorReviewFilterDto {
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
    example: 4,
    required: false,
    description: 'Filter by rating (1-5)'
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @ApiProperty({ 
    example: '2024-01-01',
    required: false,
    description: 'Start date for reviews'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ 
    example: '2024-12-31',
    required: false,
    description: 'End date for reviews'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ 
    example: 'rating',
    required: false,
    description: 'Sort by field'
  })
  @IsOptional()
  @IsString()
  sortBy?: 'rating' | 'createdAt' | 'helpfulCount';

  @ApiProperty({ 
    example: 'desc',
    required: false,
    description: 'Sort order'
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}