import { IsString, IsNumber, Min } from 'class-validator';
export class CreateProductDto {
  @IsString() title: string;
  @IsNumber() price: number;
  @IsString() description: string;
  @IsNumber() @Min(0) stock: number;
}
