// src/categories/dto/create-category.dto.ts
import { IsString, IsOptional, IsNumber, IsBoolean, Min, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'All electronic devices', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  parentId?: number;

  @ApiProperty({ example: 'https://example.com/category.jpg', required: false })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}