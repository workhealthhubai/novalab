import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ExaminationType } from '@osgb/shared-types';

export class CreateExaminationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ enum: Object.values(ExaminationType) })
  @IsEnum(ExaminationType)
  type!: ExaminationType;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Physician user id' })
  @IsOptional()
  @IsUUID()
  physicianId?: string;

  @ApiPropertyOptional({ description: 'Clinical notes (medical data)' })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  findings?: string;
}
