import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Staff confirmed the identity against the physical document (no electronic source). */
export class MarkIdentityVerifiedDto {
  @ApiPropertyOptional({
    description: 'Which document was checked, e.g. "TC kimlik kartı görüldü"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
