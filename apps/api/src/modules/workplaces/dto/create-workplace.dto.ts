import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { HazardClass } from '@osgb/shared-types';

export class CreateWorkplaceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  companyId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sgkRegistrationNumber?: string;

  @ApiPropertyOptional({ enum: Object.values(HazardClass) })
  @IsOptional()
  @IsEnum(HazardClass)
  hazardClass?: HazardClass;

  @ApiPropertyOptional({ description: 'NACE activity code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  naceCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  employeeCount?: number;
}
