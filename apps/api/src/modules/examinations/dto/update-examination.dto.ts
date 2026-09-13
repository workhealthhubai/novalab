import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { FitnessDecision } from '@osgb/shared-types';
import {
  MUTABLE_EXAMINATION_STATUSES,
  type MutableExaminationStatus,
} from '../examination-status.policy';
import { CreateExaminationDto } from './create-examination.dto';

export class UpdateExaminationDto extends PartialType(
  OmitType(CreateExaminationDto, ['employeeId'] as const),
) {
  @ApiPropertyOptional({
    enum: MUTABLE_EXAMINATION_STATUSES,
    description: 'APPROVED is only available through POST /health-reports/:id/approve',
  })
  @IsOptional()
  @IsIn(MUTABLE_EXAMINATION_STATUSES)
  status?: MutableExaminationStatus;

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
