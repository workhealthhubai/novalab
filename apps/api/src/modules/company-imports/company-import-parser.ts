import type { HazardClass } from '@osgb/shared-types';
import {
  cellText,
  foldKey,
  type ImportColumn,
  mapHeaders as mapSheetHeaders,
  type RowStatus,
} from '@/modules/imports/sheet-reader';

export const COMPANY_COLUMNS = [
  { key: 'name', header: 'Firma Adı', required: true },
  { key: 'taxNumber', header: 'Vergi No', required: false },
  { key: 'sgkRegistrationNumber', header: 'SGK Sicil No', required: false },
  { key: 'hazardClass', header: 'Tehlike Sınıfı', required: false },
  { key: 'phone', header: 'Telefon', required: false },
  { key: 'email', header: 'e-Posta', required: false },
  { key: 'address', header: 'Adres', required: false },
] as const satisfies ReadonlyArray<ImportColumn<string>>;

export type CompanyColumnKey = (typeof COMPANY_COLUMNS)[number]['key'];
export type CompanyRawRow = Partial<Record<CompanyColumnKey, unknown>>;

export const COMPANY_HEADER_ALIASES: Record<string, CompanyColumnKey> = {
  firma: 'name',
  firmaadi: 'name',
  unvan: 'name',
  ticariunvan: 'name',
  sirket: 'name',
  isveren: 'name',
  vergino: 'taxNumber',
  vergikimlikno: 'taxNumber',
  vkn: 'taxNumber',
  sgkno: 'sgkRegistrationNumber',
  sgksicil: 'sgkRegistrationNumber',
  sgksicilno: 'sgkRegistrationNumber',
  tehlikesinifi: 'hazardClass',
  tehlike: 'hazardClass',
  telefon: 'phone',
  tel: 'phone',
  eposta: 'email',
  email: 'email',
  mail: 'email',
  adres: 'address',
};

export function mapHeaders(headers: unknown[]) {
  return mapSheetHeaders(
    headers,
    COMPANY_COLUMNS as ReadonlyArray<ImportColumn<CompanyColumnKey>>,
    COMPANY_HEADER_ALIASES,
  );
}

export interface CompanyLookups {
  /** Folded names of live companies. */
  existingNames: Set<string>;
  /** Tax numbers of live companies. */
  existingTaxNumbers: Set<string>;
}

export interface ParsedCompany {
  name: string;
  taxNumber?: string;
  sgkRegistrationNumber?: string;
  hazardClass?: HazardClass;
  phone?: string;
  email?: string;
  address?: string;
}

export interface ParsedCompanyRow {
  row: number;
  status: RowStatus;
  errors: string[];
  display: Record<string, string | undefined>;
  company: ParsedCompany | null;
}

const HAZARD_LABELS: Record<HazardClass, string> = {
  LESS_HAZARDOUS: 'Az Tehlikeli',
  HAZARDOUS: 'Tehlikeli',
  VERY_HAZARDOUS: 'Çok Tehlikeli',
};

/** "Az Tehlikeli" / "az" / 1 → LESS_HAZARDOUS, "Tehlikeli" / 2, "Çok Tehlikeli" / "cok" / 3; enum keys also accepted. */
export function parseHazardClass(value: unknown): HazardClass | null | undefined {
  const s = foldKey(cellText(value));
  if (!s) return undefined;
  if (['1', 'az', 'aztehlikeli', 'lesshazardous', 'less'].includes(s)) return 'LESS_HAZARDOUS';
  if (['3', 'cok', 'coktehlikeli', 'veryhazardous', 'very'].includes(s)) return 'VERY_HAZARDOUS';
  if (['2', 'tehlikeli', 'hazardous'].includes(s)) return 'HAZARDOUS';
  return null;
}

export function parseCompanyRow(
  row: CompanyRawRow,
  rowNumber: number,
  lookups: CompanyLookups,
  seen: { names: Set<string>; taxNumbers: Set<string> },
): ParsedCompanyRow {
  const errors: string[] = [];
  const name = cellText(row.name).replace(/\s+/g, ' ');
  const taxNumber = cellText(row.taxNumber).replace(/\D/g, '');
  const sgk = cellText(row.sgkRegistrationNumber);
  const phone = cellText(row.phone);
  const email = cellText(row.email).toLowerCase();
  const address = cellText(row.address);
  const hazardClass = parseHazardClass(row.hazardClass);

  if (name.length < 2) errors.push('Firma adı boş veya çok kısa');
  if (taxNumber && !/^\d{10,11}$/.test(taxNumber)) errors.push('Vergi no 10 veya 11 hane olmalı');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('e-Posta geçersiz');
  if (hazardClass === null)
    errors.push('Tehlike sınıfı: Az Tehlikeli / Tehlikeli / Çok Tehlikeli (veya 1/2/3)');
  if (phone.length > 30) errors.push('Telefon çok uzun');

  const nameKey = foldKey(name);
  let status: RowStatus = errors.length > 0 ? 'error' : 'ok';
  if (status === 'ok') {
    if (seen.names.has(nameKey) || (taxNumber && seen.taxNumbers.has(taxNumber))) {
      status = 'duplicate';
      errors.push('Aynı firma dosyada birden fazla');
    } else if (
      lookups.existingNames.has(nameKey) ||
      (taxNumber && lookups.existingTaxNumbers.has(taxNumber))
    ) {
      status = 'exists';
      errors.push(
        taxNumber && lookups.existingTaxNumbers.has(taxNumber)
          ? 'Bu vergi numarası zaten kayıtlı'
          : 'Bu firma adı zaten kayıtlı',
      );
    }
    seen.names.add(nameKey);
    if (taxNumber) seen.taxNumbers.add(taxNumber);
  }

  const display = {
    name: name || '—',
    taxNumber: taxNumber || undefined,
    hazardClass: hazardClass ? HAZARD_LABELS[hazardClass] : undefined,
    phone: phone || undefined,
  };
  const company: ParsedCompany | null =
    status === 'ok'
      ? {
          name,
          ...(taxNumber ? { taxNumber } : {}),
          ...(sgk ? { sgkRegistrationNumber: sgk.slice(0, 50) } : {}),
          ...(hazardClass ? { hazardClass } : {}),
          ...(phone ? { phone } : {}),
          ...(email ? { email } : {}),
          ...(address ? { address: address.slice(0, 500) } : {}),
        }
      : null;
  return { row: rowNumber, status, errors, display, company };
}
