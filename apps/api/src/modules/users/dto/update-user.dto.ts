import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UserStatus } from '@osgb/shared-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'roleIds'] as const),
) {
  @ApiPropertyOptional({ enum: Object.values(UserStatus) })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
