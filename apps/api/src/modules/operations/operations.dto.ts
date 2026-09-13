import {
  IsUUID,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class OperationQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() protocolId?: string;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsString() @MaxLength(50) status?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
}
export class SaveOperationDto {
  @IsString() @MaxLength(200) title!: string;
  @IsString() date!: string;
  @IsString() @MaxLength(50) status!: string;
  @IsObject() fields!: Record<string, string>;
  @IsOptional() @IsInt() @Min(1) version?: number;
}
