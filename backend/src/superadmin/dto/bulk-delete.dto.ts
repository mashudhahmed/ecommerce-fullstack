// src/superadmin/dto/bulk-delete.dto.ts
import { IsArray, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BulkDeleteDto {
  @ApiProperty({ 
    example: [1, 2, 3, 4, 5],
    description: 'Array of user IDs to delete'
  })
  @IsArray()
  @IsNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  userIds!: number[];
}