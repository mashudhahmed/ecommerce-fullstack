// backend/src/products/dto/create-product.dto.ts
import {
  IsString,
  IsNumber,
  Min,
  MaxLength,
  IsOptional,
  IsUrl,
  IsInt,
  IsPositive,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({
    example: 'Smartphone X',
    description: 'Product title',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  title!: string;

  @ApiProperty({
    example: 599.99,
    description: 'Product price',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  price!: number;

  @ApiProperty({
    example: 'Latest smartphone with amazing features',
    description: 'Product description',
    maxLength: 1000,
    required: false,
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description!: string;

  @ApiProperty({
    example: 50,
    description: 'Available stock quantity',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock!: number;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Product image URL',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid image URL format' })
  imageUrl?: string;

  // ✅ Category - Now Required
  @ApiProperty({
    example: 1,
    description: 'Category ID the product belongs to',
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  categoryId!: number;

  // ✅ Optional fields
  @ApiPropertyOptional({
    example: 799.99,
    description: 'Compare at price (original price for discount display)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  compareAtPrice?: number;

  @ApiPropertyOptional({
    example: 'SKU-12345',
    description: 'Product SKU (Stock Keeping Unit)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the product is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the product is trending',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isTrending?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the product is new',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isNew?: boolean;

  @ApiPropertyOptional({
    example: ['image1.jpg', 'image2.jpg'],
    description: 'Additional product images',
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  additionalImages?: string[];
}