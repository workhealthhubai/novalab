import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { ExaminationType } from '@osgb/shared-types';

export class UpdateProtocolDto {
  @ApiPropertyOptional({ enum: Object.values(ExaminationType) })
  @IsOptional()
  @IsEnum(ExaminationType)
  type?: ExaminationType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'null clears the workplace' })
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  companyId?: string | null;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
