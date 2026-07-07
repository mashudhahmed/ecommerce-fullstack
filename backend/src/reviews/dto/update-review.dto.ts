// src/reviews/dto/update-review.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateReviewDto } from './create-review.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateReviewDto extends PartialType(CreateReviewDto) {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}