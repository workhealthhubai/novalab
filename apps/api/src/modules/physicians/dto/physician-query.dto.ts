import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PhysicianStatus } from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class PhysicianQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Name, specialty or diploma number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: Object.values(PhysicianStatus) })
  @IsOptional()
  @IsEnum(PhysicianStatus)
  status?: PhysicianStatus;
}
