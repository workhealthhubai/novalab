import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Admin-set (temporary) password; every session of the user is revoked afterwards. */
export class SetPasswordDto {
  @ApiProperty({ minLength: 10, description: 'At least 10 characters with letters and digits' })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: 'password must contain letters and digits' })
  password!: string;
}
