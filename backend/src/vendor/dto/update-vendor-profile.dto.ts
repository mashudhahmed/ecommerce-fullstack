// src/vendor/dto/update-vendor-profile.dto.ts
import { IsString, IsOptional, MaxLength, IsPhoneNumber, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVendorProfileDto {
  @ApiProperty({ 
    example: 'John Doe', 
    required: false,
    description: 'Vendor name'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiProperty({ 
    example: 'Tech Gadgets Store', 
    required: false,
    description: 'Business name'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendorBusinessName?: string;

  @ApiProperty({ 
    example: 'We sell the latest tech gadgets', 
    required: false,
    description: 'Business description'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  vendorBusinessDescription?: string;

  @ApiProperty({ 
    example: '+1234567890', 
    required: false,
    description: 'Phone number'
  })
  @IsOptional()
  @IsPhoneNumber()
  vendorPhoneNumber?: string;

  @ApiProperty({ 
    example: '123 Main St, City, Country', 
    required: false,
    description: 'Business address'
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  vendorAddress?: string;

  @ApiProperty({ 
    example: 'REG-12345', 
    required: false,
    description: 'Business registration number'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vendorBusinessRegistration?: string;

  @ApiProperty({ 
    example: 'https://example.com/logo.png', 
    required: false,
    description: 'Business logo URL'
  })
  @IsOptional()
  @IsUrl()
  vendorLogo?: string;
}