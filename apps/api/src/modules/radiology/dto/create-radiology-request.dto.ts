import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { RadiologyModality } from '@osgb/shared-types';

export class CreateRadiologyRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  examinationId?: string;

  @ApiProperty({ enum: Object.values(RadiologyModality), example: 'CR' })
  @IsEnum(RadiologyModality)
  modality!: RadiologyModality;

  @ApiPropertyOptional({ example: 'CHEST' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bodyPart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  clinicalInfo?: string;
}
