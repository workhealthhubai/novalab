import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { EmployeeStatus, Gender, normalizeGsm, normalizePersonName } from '@osgb/shared-types';
import { IsGsm, IsLandline, IsTurkishId } from '@/common/validators/identity.validators';

const trimName = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizePersonName(value) : value;
const digits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeGsm(value) : value;
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Patient / employee registration ("Hasta Kayıt").
 * Validation catches most data-entry errors before persistence: TC Kimlik No checksum,
 * GSM mask (5XX XXX XX XX), e-mail format, enumerated gender, structured address.
 */
export class CreateEmployeeDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Workplace; may be assigned after registration',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workplaceId?: string;

  @ApiProperty({
    description: 'T.C. Kimlik No (11 digits, checksum validated)',
    example: '10000000146',
  })
  @IsTurkishId()
  nationalId!: string;

  @ApiPropertyOptional({
    description: 'Sicil No / Belge No (card document number from the MRZ can be stored here)',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;

  @ApiPropertyOptional({ description: 'Pasaport No' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/i, { message: 'passportNumber must be alphanumeric' })
  passportNumber?: string;

  @ApiProperty()
  @Transform(trimName)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @Transform(trimName)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ format: 'date', example: '1990-01-15' })
  @IsDateString()
  birthDate!: string;

  @ApiPropertyOptional({ enum: Object.values(Gender) })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Anne Adı' })
  @Transform(trimName)
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  motherName?: string;

  @ApiPropertyOptional({ description: 'Baba Adı' })
  @Transform(trimName)
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fatherName?: string;

  @ApiProperty({
    description: 'GSM, 10 digits starting with 5 (formatting/country code is stripped)',
    example: '5321234567',
  })
  @Transform(digits)
  @IsGsm()
  phone!: string;

  @ApiPropertyOptional({ description: 'Ev Tel, 10 digits' })
  @Transform(digits)
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsLandline()
  homePhone?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ description: 'İl id (plate code)' })
  @IsOptional()
  @IsInt()
  addressProvinceId?: number;

  @ApiPropertyOptional({ description: 'İlçe id' })
  @ValidateIf(
    (o: CreateEmployeeDto) => o.addressDistrictId !== undefined && o.addressDistrictId !== null,
  )
  @IsInt()
  addressDistrictId?: number;

  @ApiPropertyOptional({ description: 'Mahalle id' })
  @ValidateIf(
    (o: CreateEmployeeDto) =>
      o.addressNeighborhoodId !== undefined && o.addressNeighborhoodId !== null,
  )
  @IsInt()
  addressNeighborhoodId?: number;

  @ApiPropertyOptional({ description: 'Remaining address (street, building, door)' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressLine?: string;

  @ApiPropertyOptional({ description: 'Uyarı / Açıklama' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Occupation from the catalogue; null clears',
  })
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  occupationId?: string | null;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ format: 'date' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({ enum: Object.values(EmployeeStatus) })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}
