import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { STORABLE_MEASUREMENT_KEYS } from '@osgb/shared-types';

export class MeasurementInputDto {
  @ApiProperty({ enum: STORABLE_MEASUREMENT_KEYS })
  @IsIn(STORABLE_MEASUREMENT_KEYS)
  key!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  value!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

/** Replace-all semantics: keys not listed are removed from the examination. */
export class SetMeasurementsDto {
  @ApiProperty({ type: [MeasurementInputDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MeasurementInputDto)
  measurements!: MeasurementInputDto[];
}

export class TimelineQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;
}

export class CompareQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;

  @ApiPropertyOptional({
    description: 'Comma-separated examination ids (2–6). Defaults to the latest three.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsUUID('4', { each: true })
  ids?: string[];
}
