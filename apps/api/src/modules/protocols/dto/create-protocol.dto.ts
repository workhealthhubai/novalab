import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ExaminationType, ProtocolItemType } from '@osgb/shared-types';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateProtocolDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ enum: Object.values(ExaminationType), description: 'Visit reason' })
  @IsEnum(ExaminationType)
  type!: ExaminationType;

  @ApiPropertyOptional({
    format: 'uuid',
    description: "Workplace for this visit; defaults to the employee's company",
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty({
    enum: Object.values(ProtocolItemType),
    isArray: true,
    description: 'Ordered tests',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsEnum(ProtocolItemType, { each: true })
  items!: ProtocolItemType[];

  @ApiPropertyOptional({ maxLength: 1000 })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
