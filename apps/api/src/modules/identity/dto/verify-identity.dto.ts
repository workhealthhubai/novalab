import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { normalizePersonName } from '@osgb/shared-types';
import { IsTurkishId } from '@/common/validators/identity.validators';

export class VerifyIdentityDto {
  @ApiProperty({ example: '10000000146' })
  @IsTurkishId()
  nationalId!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizePersonName(value as string))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizePersonName(value as string))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 1990 })
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  birthYear!: number;
}
