// src/user/dto/change-email.dto.ts
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeEmailDto {
  @ApiProperty({ example: 'newemail@example.com' })
  @IsEmail()
  @MaxLength(254)
  newEmail!: string;

  @ApiProperty({ example: 'CurrentPassword123!' })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;
}