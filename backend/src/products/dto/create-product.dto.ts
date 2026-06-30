import {
  IsString,
  IsNumber,
  Min,
  MaxLength,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Smartphone X' })
  @IsString()
  @MaxLength(100)
  title!: string;

  @ApiProperty({ example: 599.99 })
  @IsNumber()
  @Min(0.01)
  price!: number;

  @ApiProperty({ example: 'Latest smartphone with amazing features' })
  @IsString()
  @MaxLength(1000)
  description!: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  stock!: number;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}