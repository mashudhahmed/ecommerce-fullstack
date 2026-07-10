// src/auth/dto/enable-2fa.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnableTwoFactorDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  method?: 'authenticator' | 'sms' | 'email';
}

export class VerifyTwoFactorDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  token!: string;
}

export class DisableTwoFactorDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  token!: string;
}