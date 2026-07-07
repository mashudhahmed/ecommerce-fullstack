// src/reviews/dto/create-review.dto.ts
import { IsInt, IsString, Min, Max, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ example: 'Great product!', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ example: 'I really loved this product, highly recommended!', required: false })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  comment?: string;

  @ApiProperty({ example: ['https://example.com/image1.jpg'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}