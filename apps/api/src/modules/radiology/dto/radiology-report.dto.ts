import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RadiologyReportDto {
  @ApiProperty({ description: 'Radiology report text (medical data)' })
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  reportText!: string;
}
