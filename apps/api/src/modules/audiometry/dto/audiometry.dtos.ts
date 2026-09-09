import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const nullable = (_: unknown, value: unknown) => value !== null && value !== undefined;

/** Threshold maps are validated in the service with the shared `normalizeThresholds`. */
export class CreateAudiometryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;

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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isBaseline?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Hours without noise exposure before the test',
  })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(0)
  @Max(720)
  quietHours?: number | null;

  @ApiProperty({ description: 'Air conduction, right ear: { "500": 10, … } dB HL' })
  @IsObject()
  airRight!: Record<string, number | null>;

  @ApiProperty({ description: 'Air conduction, left ear' })
  @IsObject()
  airLeft!: Record<string, number | null>;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf(nullable)
  @IsObject()
  boneRight?: Record<string, number | null> | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf(nullable)
  @IsObject()
  boneLeft?: Record<string, number | null> | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateAudiometryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBaseline?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  @Min(0)
  @Max(720)
  quietHours?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  airRight?: Record<string, number | null>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  airLeft?: Record<string, number | null>;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf(nullable)
  @IsObject()
  boneRight?: Record<string, number | null> | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf(nullable)
  @IsObject()
  boneLeft?: Record<string, number | null> | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class AudiometryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

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
