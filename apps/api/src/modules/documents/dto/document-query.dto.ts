import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DocumentCategory } from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class DocumentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ enum: Object.values(DocumentCategory) })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;
}
