import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessPayoutDto {
  @ApiProperty({
    enum: ['approve', 'reject'],
    example: 'approve',
    description: 'Approval action for the payout request',
  })
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  @ApiPropertyOptional({
    example: 'WIRE-98324-REF',
    description: 'Transaction confirmation or bank transfer reference code',
  })
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @ApiPropertyOptional({
    example: 'Processed via wire transfer on Monday',
    description: 'Internal notes or feedback for the seller',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
