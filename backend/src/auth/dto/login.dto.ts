// src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ 
    required: false, 
    example: '123456',
    description: '6-digit TOTP code if 2FA is enabled for the account'
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  twoFactorToken?: string;
}