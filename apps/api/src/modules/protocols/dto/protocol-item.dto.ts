import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ProtocolItemStatus, ProtocolItemType } from '@osgb/shared-types';

export class AddProtocolItemsDto {
  @ApiProperty({ enum: Object.values(ProtocolItemType), isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsEnum(ProtocolItemType, { each: true })
  items!: ProtocolItemType[];
}

export class UpdateProtocolItemDto {
  @ApiPropertyOptional({ enum: Object.values(ProtocolItemStatus) })
  @IsOptional()
  @IsEnum(ProtocolItemStatus)
  status?: ProtocolItemStatus;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class ProtocolItemParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  itemId!: string;
}

export class CloseProtocolDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'Cancel still-pending items instead of refusing to close' })
  @IsOptional()
  @IsBoolean()
  cancelPending?: boolean;
}
