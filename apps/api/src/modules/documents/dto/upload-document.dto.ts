import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DocumentCategory } from '@osgb/shared-types';

/**
 * Multipart form fields accompanying the `file` part (the file itself is handled by
 * FileInterceptor and must not be declared here: undecorated class fields would be
 * rejected by the whitelist validation).
 */
export class UploadDocumentDto {
  @ApiPropertyOptional({ enum: Object.values(DocumentCategory), default: DocumentCategory.OTHER })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ description: 'Mark as medical document (stricter access rules)' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isMedical?: boolean;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  examinationId?: string;
}
