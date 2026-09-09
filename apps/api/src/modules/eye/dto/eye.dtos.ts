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
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  ColorVisionResult,
  EYE_RANGES,
  EyeRecommendation,
  VisualFieldResult,
} from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const nullable = (_: unknown, value: unknown) => value !== null && value !== undefined;

class EyeFieldsDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  usesGlasses?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  usesContactLenses?: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'Decimal acuity (1.0 = 6/6)' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(EYE_RANGES.acuity.min)
  @Max(EYE_RANGES.acuity.max)
  farRight?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(EYE_RANGES.acuity.min)
  @Max(EYE_RANGES.acuity.max)
  farLeft?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(EYE_RANGES.acuity.min)
  @Max(EYE_RANGES.acuity.max)
  farRightCorrected?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(EYE_RANGES.acuity.min)
  @Max(EYE_RANGES.acuity.max)
  farLeftCorrected?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Jaeger 1–10' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(EYE_RANGES.jaeger.min)
  @Max(EYE_RANGES.jaeger.max)
  nearRight?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(EYE_RANGES.jaeger.min)
  @Max(EYE_RANGES.jaeger.max)
  nearLeft?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(0)
  @Max(EYE_RANGES.ishiharaPlates.max)
  ishiharaCorrect?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(EYE_RANGES.ishiharaPlates.min)
  @Max(EYE_RANGES.ishiharaPlates.max)
  ishiharaTotal?: number | null;

  @ApiPropertyOptional({ enum: Object.values(ColorVisionResult) })
  @IsOptional()
  @IsEnum(ColorVisionResult)
  colorVision?: ColorVisionResult;

  @ApiPropertyOptional({ enum: Object.values(VisualFieldResult) })
  @IsOptional()
  @IsEnum(VisualFieldResult)
  visualField?: VisualFieldResult;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(2000)
  findings?: string | null;

  @ApiPropertyOptional({
    enum: Object.values(EyeRecommendation),
    description: 'Omit to use the suggested one',
  })
  @IsOptional()
  @IsEnum(EyeRecommendation)
  recommendation?: EyeRecommendation;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(4000)
  comment?: string | null;
}

export class CreateEyeDto extends EyeFieldsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;
}

export class UpdateEyeDto extends EyeFieldsDto {}

export class EyeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: Object.values(EyeRecommendation) })
  @IsOptional()
  @IsEnum(EyeRecommendation)
  recommendation?: EyeRecommendation;

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
