import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ECG_FINDING_CODES, ECG_RANGES, EcgInterpretation, EcgRhythm } from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const nullable = (_: unknown, value: unknown) => value !== null && value !== undefined;

/** Shared optional measurement fields; `null` clears a value, omitted leaves it untouched on PATCH. */
class EcgFieldsDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsUUID()
  protocolId?: string | null;

  @ApiPropertyOptional({ description: 'ISO datetime; defaults to now' })
  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(120)
  deviceName?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'bpm' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(ECG_RANGES.heartRate.min)
  @Max(ECG_RANGES.heartRate.max)
  heartRate?: number | null;

  @ApiPropertyOptional({ enum: Object.values(EcgRhythm), nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsEnum(EcgRhythm)
  rhythm?: EcgRhythm | null;

  @ApiPropertyOptional({ nullable: true, description: 'ms' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(ECG_RANGES.prInterval.min)
  @Max(ECG_RANGES.prInterval.max)
  prInterval?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'ms' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(ECG_RANGES.qrsDuration.min)
  @Max(ECG_RANGES.qrsDuration.max)
  qrsDuration?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'ms' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(ECG_RANGES.qtInterval.min)
  @Max(ECG_RANGES.qtInterval.max)
  qtInterval?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'ms, as reported by the device' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(ECG_RANGES.qtcInterval.min)
  @Max(ECG_RANGES.qtcInterval.max)
  qtcInterval?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'degrees' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(ECG_RANGES.axis.min)
  @Max(ECG_RANGES.axis.max)
  axis?: number | null;

  @ApiPropertyOptional({ type: [String], enum: ECG_FINDING_CODES })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsIn(ECG_FINDING_CODES, { each: true })
  findings?: string[];

  @ApiPropertyOptional({ enum: Object.values(EcgInterpretation) })
  @IsOptional()
  @IsEnum(EcgInterpretation)
  interpretation?: EcgInterpretation;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(4000)
  comment?: string | null;
}

export class CreateEcgDto extends EcgFieldsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;
}

export class UpdateEcgDto extends EcgFieldsDto {}

export class EcgQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: Object.values(EcgInterpretation) })
  @IsOptional()
  @IsEnum(EcgInterpretation)
  interpretation?: EcgInterpretation;

  @ApiPropertyOptional({ description: 'Patient name / TC prefix' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Performed from (ISO date, inclusive)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Performed until (ISO date, inclusive)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
