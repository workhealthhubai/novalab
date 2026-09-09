import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TestCategory } from '@osgb/shared-types';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class TestQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Code or name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: Object.values(TestCategory) })
  @IsOptional()
  @IsEnum(TestCategory)
  category?: TestCategory;

  @ApiPropertyOptional({ description: 'true = only active, false = only inactive' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  isActive?: boolean;
}
