// src/vendor/dto/bulk-product-delete.dto.ts
import { IsArray, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkProductDeleteDto {
  @ApiProperty({ example: [1, 2, 3] })
  @IsArray()
  @IsNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  productIds!: number[];
}