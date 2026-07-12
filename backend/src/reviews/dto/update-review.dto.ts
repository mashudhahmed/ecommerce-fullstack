// src/reviews/dto/update-review.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateReviewDto } from './create-review.dto';
import { IsOptional, IsBoolean, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateReviewDto extends PartialType(CreateReviewDto) {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @ApiProperty({ 
    example: ['https://cloudinary.com/image1.jpg', 'https://cloudinary.com/image2.jpg'],
    required: false,
    description: 'URLs of existing images to keep'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  existingImages?: string[];
}