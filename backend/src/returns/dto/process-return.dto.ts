import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessReturnDto {
  @ApiProperty({
    enum: ['approve', 'reject'],
    example: 'approve',
    description: 'Decision action for the return request',
  })
  @IsIn(['approve', 'reject'])
  @IsNotEmpty()
  action!: 'approve' | 'reject';

  @ApiPropertyOptional({
    example: 'Item shows signs of deliberate customer misuse beyond warranty terms.',
    description: 'Explanation provided to the customer if rejected',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({
    example: 'Return package received and verified. Authorized full refund.',
    description: 'Internal merchant/admin notes',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
