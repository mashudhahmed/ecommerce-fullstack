// src/vendor/dto/vendor-registration.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export class VendorRegistrationDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: 'vendor@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'VendorPassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_REGEX, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password!: string;

  @ApiProperty({ example: 'Tech Gadgets Store' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessName!: string;

  @ApiProperty({ example: 'We sell the latest tech gadgets' })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @IsOptional()
  businessDescription?: string;

  @ApiProperty({ example: '+1234567890' })
  @IsPhoneNumber()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: '123 Main St, City, Country' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'REG-12345' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  businessRegistration?: string;
}