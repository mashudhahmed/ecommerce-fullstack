// src/vendor/dto/vendor-bulk-action.dto.ts
import { IsArray, IsNotEmpty, IsString, IsOptional, IsIn, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VendorBulkActionDto {
  @ApiProperty({ enum: ['approve', 'reject', 'suspend', 'activate'] })
  @IsString()
  @IsIn(['approve', 'reject', 'suspend', 'activate'])
  action!: string;

  @ApiProperty({ example: [1, 2, 3] })
  @IsArray()
  @IsNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  vendorIds!: number[];

  @ApiProperty({ example: 'Reason for action', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}