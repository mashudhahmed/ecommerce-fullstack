// src/vendor/dto/bulk-product-upload.dto.ts
import { IsArray, IsOptional, IsString, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BulkProductItemDto {
  @ApiProperty({ example: 'Product Title' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 29.99 })
  @IsNumber()
  @Min(0.01)
  price!: number;

  @ApiProperty({ example: 'Product description' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  stock!: number;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  categoryId?: number;
}

export class BulkProductUploadDto {
  @ApiProperty({ type: [BulkProductItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkProductItemDto)
  products!: BulkProductItemDto[];
}