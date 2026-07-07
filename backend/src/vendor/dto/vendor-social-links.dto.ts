// src/vendor/dto/vendor-social-links.dto.ts
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VendorSocialLinksDto {
  @ApiProperty({ 
    example: 'https://facebook.com/techstore', 
    required: false,
    description: 'Facebook page URL'
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  facebook?: string;

  @ApiProperty({ 
    example: 'https://instagram.com/techstore', 
    required: false,
    description: 'Instagram profile URL'
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  instagram?: string;

  @ApiProperty({ 
    example: 'https://twitter.com/techstore', 
    required: false,
    description: 'Twitter/X profile URL'
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  twitter?: string;

  @ApiProperty({ 
    example: 'https://linkedin.com/company/techstore', 
    required: false,
    description: 'LinkedIn company URL'
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  linkedin?: string;

  @ApiProperty({ 
    example: 'https://youtube.com/c/techstore', 
    required: false,
    description: 'YouTube channel URL'
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  youtube?: string;

  @ApiProperty({ 
    example: 'https://pinterest.com/techstore', 
    required: false,
    description: 'Pinterest profile URL'
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  pinterest?: string;

  @ApiProperty({ 
    example: 'https://tiktok.com/@techstore', 
    required: false,
    description: 'TikTok profile URL'
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  tiktok?: string;

  @ApiProperty({ 
    example: 'https://whatsapp.com/channel/techstore', 
    required: false,
    description: 'WhatsApp channel URL'
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  whatsapp?: string;

  @ApiProperty({ 
    example: 'https://telegram.me/techstore', 
    required: false,
    description: 'Telegram channel URL'
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  telegram?: string;

  @ApiProperty({ 
    example: 'https://discord.gg/techstore', 
    required: false,
    description: 'Discord server invite URL'
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  discord?: string;
}