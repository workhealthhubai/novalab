import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { SmokingStatus, SPIROMETRY_RANGES, SpirometryPattern } from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const nullable = (_: unknown, value: unknown) => value !== null && value !== undefined;

class SpirometryFieldsDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsUUID()
  protocolId?: string | null;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(SPIROMETRY_RANGES.heightCm.min)
  @Max(SPIROMETRY_RANGES.heightCm.max)
  heightCm?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(SPIROMETRY_RANGES.weightKg.min)
  @Max(SPIROMETRY_RANGES.weightKg.max)
  weightKg?: number | null;

  @ApiPropertyOptional({ enum: Object.values(SmokingStatus), nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsEnum(SmokingStatus)
  smokingStatus?: SmokingStatus | null;

  @ApiPropertyOptional({ nullable: true, description: 'L' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(SPIROMETRY_RANGES.fvc.min)
  @Max(SPIROMETRY_RANGES.fvc.max)
  fvc?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'L' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(SPIROMETRY_RANGES.fev1.min)
  @Max(SPIROMETRY_RANGES.fev1.max)
  fev1?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'FEV1/FVC %' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(SPIROMETRY_RANGES.ratio.min)
  @Max(SPIROMETRY_RANGES.ratio.max)
  ratio?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'L/s' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(SPIROMETRY_RANGES.pef.min)
  @Max(SPIROMETRY_RANGES.pef.max)
  pef?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'L/s' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(SPIROMETRY_RANGES.fef2575.min)
  @Max(SPIROMETRY_RANGES.fef2575.max)
  fef2575?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Device predicted FVC, L' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(SPIROMETRY_RANGES.fvc.min)
  @Max(SPIROMETRY_RANGES.fvc.max)
  fvcPredicted?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Device predicted FEV1, L' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(SPIROMETRY_RANGES.fev1.min)
  @Max(SPIROMETRY_RANGES.fev1.max)
  fev1Predicted?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Post-bronchodilator FVC, L' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(SPIROMETRY_RANGES.fvc.min)
  @Max(SPIROMETRY_RANGES.fvc.max)
  postFvc?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Post-bronchodilator FEV1, L' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(SPIROMETRY_RANGES.fev1.min)
  @Max(SPIROMETRY_RANGES.fev1.max)
  postFev1?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'A–F' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || null : value,
  )
  @IsOptional()
  @ValidateIf(nullable)
  @Matches(/^[A-F]$/)
  qualityGrade?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBaseline?: boolean;

  @ApiPropertyOptional({
    enum: Object.values(SpirometryPattern),
    nullable: true,
    description: 'Physician-confirmed pattern; null = use the derived one',
  })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsEnum(SpirometryPattern)
  pattern?: SpirometryPattern | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(4000)
  comment?: string | null;
}

export class CreateSpirometryDto extends SpirometryFieldsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;
}

export class UpdateSpirometryDto extends SpirometryFieldsDto {}

export class SpirometryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: Object.values(SpirometryPattern) })
  @IsOptional()
  @IsEnum(SpirometryPattern)
  pattern?: SpirometryPattern;

  @ApiPropertyOptional({ description: 'Patient name / TC prefix' })
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
