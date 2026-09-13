import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SwitchTenantDto {
  @ApiProperty({ description: 'Target tenant ID to switch active context into', format: 'uuid' })
  @IsUUID('4')
  targetTenantId!: string;
}
