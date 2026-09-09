import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ExaminationStatus, FitnessDecision } from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const nullable = (_: unknown, value: unknown) => value !== null && value !== undefined;

export class CreateReportDto {
  @ApiProperty({ format: 'uuid', description: 'Protocol the report belongs to' })
  @IsUUID()
  protocolId!: string;
}

/** Report content; the JSON sections are validated in the service against the shared catalogues. */
export class UpdateReportDto {
  @ApiPropertyOptional({ description: 'ISO datetime of the examination' })
  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsUUID()
  physicianProfileId?: string | null;

  @ApiPropertyOptional({ description: 'Shared Anamnesis shape' })
  @IsOptional()
  @IsObject()
  anamnesis?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Shared SystemsExam shape' })
  @IsOptional()
  @IsObject()
  systemsExam?: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(6000)
  findings?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(4000)
  conclusion?: string | null;

  @ApiPropertyOptional({ enum: Object.values(FitnessDecision) })
  @IsOptional()
  @IsEnum(FitnessDecision)
  fitnessDecision?: FitnessDecision;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(2000)
  restrictions?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'ISO date' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsDateString()
  nextExaminationDue?: string | null;
}

export class ReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: Object.values(ExaminationStatus) })
  @IsOptional()
  @IsEnum(ExaminationStatus)
  status?: ExaminationStatus;

  @ApiPropertyOptional({ enum: Object.values(FitnessDecision) })
  @IsOptional()
  @IsEnum(FitnessDecision)
  fitnessDecision?: FitnessDecision;

  @ApiPropertyOptional({ description: 'Patient name / TC prefix or protocol number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
