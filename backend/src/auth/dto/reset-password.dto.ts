import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export class ResetPasswordDto {
  @ApiProperty({ example: 'verification-token-here' })
  @IsString()
  verificationToken!: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword!: string;
}
