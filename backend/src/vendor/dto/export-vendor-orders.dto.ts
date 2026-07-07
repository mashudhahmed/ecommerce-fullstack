// src/vendor/dto/export-vendor-orders.dto.ts
import { IsOptional, IsString, IsIn, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExportVendorOrdersDto {
  @ApiProperty({ enum: ['csv', 'excel', 'pdf'], default: 'csv' })
  @IsOptional()
  @IsString()
  @IsIn(['csv', 'excel', 'pdf'])
  format?: 'csv' | 'excel' | 'pdf' = 'csv';

  @ApiProperty({ example: '2024-01-01', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 'delivered', required: false })
  @IsOptional()
  @IsString()
  status?: string;
}