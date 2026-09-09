import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ConsentMethod, ConsentStatus, ConsentType } from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const nullable = (_: unknown, value: unknown) => value !== null && value !== undefined;

/** Publishes a new version of a consent text (versions are never edited in place). */
export class PublishTemplateDto {
  @ApiProperty({ enum: Object.values(ConsentType) })
  @IsEnum(ConsentType)
  type!: ConsentType;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: 'Plain text / Markdown' })
  @IsString()
  @MinLength(20)
  @MaxLength(20000)
  body!: string;

  @ApiPropertyOptional({ description: 'ISO date; defaults to now' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}

export class TemplateQueryDto {
  @ApiPropertyOptional({ enum: Object.values(ConsentType) })
  @IsOptional()
  @IsEnum(ConsentType)
  type?: ConsentType;

  @ApiPropertyOptional({ description: 'true = only the version in force per type' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  activeOnly?: boolean;
}

export class GiveConsentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Specific template version; defaults to the version in force for `type`',
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    enum: Object.values(ConsentType),
    description: 'Used when templateId is omitted',
  })
  @IsOptional()
  @IsEnum(ConsentType)
  type?: ConsentType;

  @ApiProperty({ enum: Object.values(ConsentMethod) })
  @IsEnum(ConsentMethod)
  method!: ConsentMethod;

  @ApiPropertyOptional({ description: 'ISO datetime; defaults to now' })
  @IsOptional()
  @IsDateString()
  givenAt?: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class WithdrawConsentDto {
  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

export class ConsentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: Object.values(ConsentType) })
  @IsOptional()
  @IsEnum(ConsentType)
  type?: ConsentType;

  @ApiPropertyOptional({ enum: Object.values(ConsentStatus) })
  @IsOptional()
  @IsEnum(ConsentStatus)
  status?: ConsentStatus;

  @ApiPropertyOptional({ description: 'Patient name / TC prefix' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
