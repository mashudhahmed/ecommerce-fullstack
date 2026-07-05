import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartDto {
  @ApiProperty({ 
    example: 1, 
    description: 'Product ID to update',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiProperty({ 
    example: 3, 
    description: 'New quantity (0-99). Set to 0 to remove item',
    minimum: 0,
    maximum: 99,
  })
  @IsInt()
  @Min(0)
  @Max(99)
  quantity!: number;
}