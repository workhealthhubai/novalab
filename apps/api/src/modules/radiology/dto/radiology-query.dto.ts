import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RadiologyRequestStatus } from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class RadiologyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: Object.values(RadiologyRequestStatus) })
  @IsOptional()
  @IsEnum(RadiologyRequestStatus)
  status?: RadiologyRequestStatus;
}
