import { ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TenantStatus } from '@osgb/shared-types';
import { CreateTenantDto } from './create-tenant.dto';

export class UpdateTenantDto extends PartialType(
  PickType(CreateTenantDto, ['name', 'slug', 'settings'] as const),
) {
  @ApiPropertyOptional({ enum: Object.values(TenantStatus) })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}

