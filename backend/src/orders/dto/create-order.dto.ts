// src/orders/dto/create-order.dto.ts
import {
  IsArray,
  IsInt,
  Min,
  ValidateNested,
  IsNotEmpty,
  IsPositive,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  productId!: number;

  @ApiProperty({ example: 2, description: 'Quantity (1-99)' })
  @IsInt()
  @Min(1)
  @Max(99)
  @IsNotEmpty()
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto], description: 'Order items' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsNotEmpty()
  items!: OrderItemDto[];

  @ApiProperty({
    example: '123 Main St, New York, NY 10001',
    description: 'Shipping delivery address',
    required: true,
  })
  @IsString({ message: 'Please provide a valid delivery address' })
  @IsNotEmpty({ message: 'Delivery address is required to place your order' })
  @MinLength(5, { message: 'Please provide a complete delivery address' })
  @MaxLength(1000, { message: 'Delivery address is too long' })
  shippingAddress!: string;
}
