import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DocumentCategory } from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class DocumentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['overdue', '30', '60', '90', 'undated', 'all'])
  expiry?: 'overdue' | '30' | '60' | '90' | 'undated' | 'all';

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
