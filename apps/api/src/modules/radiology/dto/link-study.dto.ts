import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class LinkStudyDto {
  @ApiProperty({
    description: 'DICOM StudyInstanceUID (0020,000D)',
    example: '1.2.826.0.1.3680043.8.498.1',
  })
  @IsString()
  @MaxLength(64)
  @Matches(/^[0-9.]+$/, { message: 'studyInstanceUid must be a valid DICOM UID' })
  studyInstanceUid!: string;
}

export class PacsListQueryDto {
  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}
