import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme OSGB' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'acme-osgb', description: 'lowercase letters, digits and dashes' })
  @IsString()
  @Matches(/^[a-z0-9-]{2,64}$/)
  slug!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'admin@acme.local' })
  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @ApiPropertyOptional({ example: 'Admin123!' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  adminPassword?: string;

  @ApiPropertyOptional({ example: 'Ahmet' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  adminFirstName?: string;

  @ApiPropertyOptional({ example: 'Yılmaz' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  adminLastName?: string;
}

