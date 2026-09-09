import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

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
