// src/vendor/dto/vendor-suspend.dto.ts
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VendorSuspendDto {
  @ApiProperty({ 
    example: true, 
    description: 'Set to true to suspend, false to activate' 
  })
  @IsBoolean()
  suspended!: boolean;

  @ApiProperty({ 
    example: 'Violation of terms of service', 
    required: false,
    description: 'Reason for suspension/activation'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}