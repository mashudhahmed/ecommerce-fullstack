// src/superadmin/dto/update-user-status.dto.ts
import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({ 
    example: true,
    description: 'Set to true to verify user, false to unverify'
  })
  @IsBoolean()
  @IsNotEmpty()
  isVerified!: boolean;
}