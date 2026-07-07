// src/vendor/dto/vendor-approval.dto.ts
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VendorApprovalDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  approve!: boolean;

  @ApiProperty({ example: 'Business meets all requirements', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}