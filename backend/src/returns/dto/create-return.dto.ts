import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnReason } from '../return.entity';

export class ReturnItemDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  @IsInt()
  @IsPositive()
  productId!: number;

  @ApiProperty({ example: 'Wireless Headphones', description: 'Product Title' })
  @IsString()
  @IsNotEmpty()
  productName!: string;

  @ApiProperty({ example: 1, description: 'Quantity to return' })
  @IsInt()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 99.99, description: 'Price paid per unit' })
  @IsNumber()
  @IsPositive()
  price!: number;
}

export class CreateReturnDto {
  @ApiProperty({ example: 8, description: 'Parent Order ID' })
  @IsInt()
  @IsPositive()
  orderId!: number;

  @ApiPropertyOptional({ example: 5, description: 'Vendor Sub-Order (Package) ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  vendorOrderId?: number;

  @ApiProperty({
    enum: ReturnReason,
    example: ReturnReason.DEFECTIVE,
    description: 'Reason for return',
  })
  @IsEnum(ReturnReason)
  reason!: ReturnReason;

  @ApiProperty({
    example: 'The headphone left ear cup stopped working after 2 days.',
    description: 'Detailed explanation of the issue',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://example.com/uploads/photo1.jpg'],
    description: 'Proof photos of the item/damage',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ type: [ReturnItemDto], description: 'Items being returned' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];
}
