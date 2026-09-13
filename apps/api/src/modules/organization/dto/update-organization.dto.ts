import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** Empty strings clear a field (stored as null). */
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const nullable = (_: unknown, value: unknown) => value !== null && value !== undefined;
const emptyToUppercaseNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() || null : value;

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Short display name (Tenant.name)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(300)
  legalName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(100)
  taxOffice?: string | null;

  @ApiPropertyOptional({ nullable: true, description: '10 digits (11 for sole proprietors)' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @Matches(/^\d{10,11}$/, { message: 'taxNumber must be 10 or 11 digits' })
  taxNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(50)
  sgkRegistrationNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(50)
  authorizationNumber?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'ISO date' })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsDateString()
  authorizationDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(150)
  responsibleManager?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(30)
  fax?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsUrl({ require_protocol: false })
  @MaxLength(200)
  website?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  addressProvinceId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf(nullable)
  @IsInt()
  addressDistrictId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(500)
  addressLine?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @ValidateIf(nullable)
  @IsString()
  @MaxLength(1000)
  reportFooter?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'DICOM AE Title of the radiology device that queries this tenant worklist',
  })
  @Transform(emptyToUppercaseNull)
  @IsOptional()
  @ValidateIf(nullable)
  @Matches(/^[A-Z0-9_.-]{1,16}$/, {
    message: 'radiologyStationAet must be 1-16 uppercase DICOM AE characters',
  })
  radiologyStationAet?: string | null;
}
