import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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
import {
  ILO_SYMBOL_CODES,
  LARGE_OPACITIES,
  LUNG_ZONES,
  OPACITY_SHAPES,
  PneumoconiosisResult,
  PROFUSIONS,
} from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const nullable = (_: unknown, value: unknown) => value !== null && value !== undefined;

class ReadingFieldsDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsUUID()
  protocolId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Chest X-ray request the film belongs to',
  })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsUUID()
  radiologyRequestId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  readAt?: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(60)
  readerRole?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'ISO date of the film' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsDateString()
  filmDate?: string | null;

  @ApiPropertyOptional({ nullable: true, description: '1–4' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(1)
  @Max(4)
  filmQuality?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(300)
  qualityComment?: string | null;

  @ApiPropertyOptional({ enum: PROFUSIONS, nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsIn(PROFUSIONS)
  profusion?: string | null;

  @ApiPropertyOptional({ enum: OPACITY_SHAPES, nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsIn(OPACITY_SHAPES)
  shapePrimary?: string | null;

  @ApiPropertyOptional({ enum: OPACITY_SHAPES, nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsIn(OPACITY_SHAPES)
  shapeSecondary?: string | null;

  @ApiPropertyOptional({ type: [String], enum: LUNG_ZONES })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(LUNG_ZONES, { each: true })
  zones?: string[];

  @ApiPropertyOptional({ enum: LARGE_OPACITIES })
  @IsOptional()
  @IsIn(LARGE_OPACITIES)
  largeOpacity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pleuralPlaques?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  plaqueCalcification?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  diffuseThickening?: boolean;

  @ApiPropertyOptional({ type: [String], enum: ['R', 'L'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @IsIn(['R', 'L'], { each: true })
  costophrenicObliteration?: string[];

  @ApiPropertyOptional({ type: [String], enum: ILO_SYMBOL_CODES })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsIn(ILO_SYMBOL_CODES, { each: true })
  symbols?: string[];

  @ApiPropertyOptional({
    enum: Object.values(PneumoconiosisResult),
    description: 'Omit to use the derived result',
  })
  @IsOptional()
  @IsEnum(PneumoconiosisResult)
  result?: PneumoconiosisResult;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(4000)
  comment?: string | null;
}

export class CreateReadingDto extends ReadingFieldsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;
}

export class UpdateReadingDto extends ReadingFieldsDto {}

export class ReadingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: Object.values(PneumoconiosisResult) })
  @IsOptional()
  @IsEnum(PneumoconiosisResult)
  result?: PneumoconiosisResult;

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
