import { IsDateString, Matches, ValidateIf } from 'class-validator';
export class UpdateDocumentExpiryDto {
  @ValidateIf((_, value) => value !== null)
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  expiresAt!: string | null;
}
