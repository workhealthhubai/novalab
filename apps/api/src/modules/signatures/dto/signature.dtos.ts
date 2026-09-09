import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class SignConsentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ format: 'uuid', description: 'Consent text version (must be the one in force)' })
  @IsUUID()
  templateId!: string;

  @ApiPropertyOptional({ description: 'Defaults to the patient name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  signerName?: string;

  @ApiProperty({ description: 'PNG data URL from the signature pad' })
  @IsString()
  @MinLength(30)
  @MaxLength(3 * 1024 * 1024)
  signature!: string;
}

/** Multipart fields next to the `file` part. */
export class SignUploadDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  signerName?: string;

  @ApiProperty({ description: 'PNG data URL from the signature pad' })
  @IsString()
  @MinLength(30)
  @MaxLength(3 * 1024 * 1024)
  signature!: string;
}

export class SignatureQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Patient name / TC prefix or form title' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
