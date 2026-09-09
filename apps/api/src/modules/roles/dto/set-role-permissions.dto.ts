import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import { ALL_PERMISSIONS, type Permission } from '@osgb/shared-types';

export class SetRolePermissionsDto {
  @ApiProperty({ type: [String], enum: ALL_PERMISSIONS })
  @IsArray()
  @ArrayUnique()
  @IsIn(ALL_PERMISSIONS, { each: true })
  permissions!: Permission[];
}
