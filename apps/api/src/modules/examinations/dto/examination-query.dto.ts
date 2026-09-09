import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ExaminationStatus } from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class ExaminationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: Object.values(ExaminationStatus) })
  @IsOptional()
  @IsEnum(ExaminationStatus)
  status?: ExaminationStatus;
}
