// src/user/dto/update-user.dto.ts - Enhanced
import { IsOptional, IsString, MinLength, MaxLength, IsEmail, Matches, IsUrl } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[\d\s-]{10,}$/, {
    message: 'Invalid phone number format',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  // ✅ NEW: Avatar URL field
  @IsOptional()
  @IsUrl({}, { message: 'Invalid avatar URL format' })
  avatar?: string;
}