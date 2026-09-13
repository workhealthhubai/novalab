import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PickType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
export class PasswordHelpDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @Matches(/^[a-z0-9-]{2,64}$/) tenantSlug!: string;
}
export class ResetPasswordDto extends PickType(CreateUserDto, ['password'] as const) {
  @IsString() @MinLength(64) @MaxLength(64) @Matches(/^[a-f0-9]+$/) token!: string;
}
