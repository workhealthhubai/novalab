import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ExaminationStatus, FitnessDecision } from '@osgb/shared-types';
import { CreateExaminationDto } from './create-examination.dto';

export class UpdateExaminationDto extends PartialType(
  OmitType(CreateExaminationDto, ['employeeId'] as const),
) {
  @ApiPropertyOptional({ enum: Object.values(ExaminationStatus) })
  @IsOptional()
  @IsEnum(ExaminationStatus)
  status?: ExaminationStatus;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  conclusion?: string;

  @ApiPropertyOptional({ enum: Object.values(FitnessDecision) })
  @IsOptional()
  @IsEnum(FitnessDecision)
  fitnessDecision?: FitnessDecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  restrictions?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  nextExaminationDue?: string;
}
