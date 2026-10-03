import { IsNumber, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPayoutDto {
  @ApiProperty({ example: 150.0, description: 'Amount to withdraw' })
  @IsNumber()
  @IsPositive()
  @Min(10, { message: 'Minimum withdrawal amount is $10.00' })
  amount!: number;

  @ApiProperty({ example: 'Bank Wire', description: 'Payment method or gateway' })
  @IsString()
  paymentMethod!: string;

  @ApiProperty({
    example: 'Bank: Chase, Account: 123456789, Routing: 987654321, Name: John Doe',
    description: 'Bank account or electronic transfer destination details',
  })
  @IsString()
  accountDetails!: string;
}
