import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { RadiologyModality, RadiologyRequestStatus } from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class RadiologyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: Object.values(RadiologyRequestStatus) })
  @IsOptional()
  @IsEnum(RadiologyRequestStatus)
  status?: RadiologyRequestStatus;

  @ApiPropertyOptional({ enum: Object.values(RadiologyModality) })
  @IsOptional()
  @IsEnum(RadiologyModality)
  modality?: RadiologyModality;

  @ApiPropertyOptional({ description: 'Patient name / TC prefix or body part' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Requested from (ISO date, inclusive)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Requested until (ISO date, inclusive)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
