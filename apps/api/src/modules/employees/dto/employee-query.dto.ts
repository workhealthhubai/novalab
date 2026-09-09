import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { EmployeeStatus, IdentityVerificationStatus } from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class EmployeeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ enum: Object.values(EmployeeStatus) })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ enum: Object.values(IdentityVerificationStatus) })
  @IsOptional()
  @IsEnum(IdentityVerificationStatus)
  identityVerificationStatus?: IdentityVerificationStatus;

  @ApiPropertyOptional({ description: 'Search by name, TC Kimlik No, Sicil No or phone' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
