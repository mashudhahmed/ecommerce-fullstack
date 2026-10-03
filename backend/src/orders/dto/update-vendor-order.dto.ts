import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorOrderStatus } from '../vendor-order.entity';

export class UpdateVendorOrderDto {
  @ApiProperty({ enum: VendorOrderStatus, example: VendorOrderStatus.SHIPPED })
  @IsEnum(VendorOrderStatus)
  status!: VendorOrderStatus;

  @ApiPropertyOptional({ example: 'FedEx' })
  @IsOptional()
  @IsString()
  carrierName?: string;

  @ApiPropertyOptional({ example: 'FX-982348234' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'https://fedex.com/track/FX-982348234' })
  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @ApiPropertyOptional({ example: 'Package safely handed over to courier' })
  @IsOptional()
  @IsString()
  notes?: string;
}
