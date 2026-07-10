// src/superadmin/dto/update-user-role.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../user/user.entity';

export class UpdateUserRoleDto {
  @ApiProperty({ 
    enum: UserRole, 
    example: UserRole.VENDOR,
    description: 'New role for the user'
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;
}