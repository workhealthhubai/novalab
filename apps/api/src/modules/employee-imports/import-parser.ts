import {
  type Gender,
  isValidGsm,
  isValidLandline,
  isValidTurkishId,
  normalizeGsm,
  normalizePersonName,
} from '@osgb/shared-types';
import {
  cellText,
  foldKey,
  type ImportColumn,
  mapHeaders as mapSheetHeaders,
  type ParseSummary,
  type RowStatus,
  summarize,
} from '@/modules/imports/sheet-reader';

// Re-exported locally rather than with `export … from`: the Nest CLI's TypeScript plugin crashes
// ("checkJsDirective") on cross-file re-exports that carry `type` specifiers.
export { cellText, foldKey, summarize };
export type { ParseSummary, RowStatus };

/** Column order of the template; headers are matched case/accent-insensitively after folding. */
export const IMPORT_COLUMNS = [
  { key: 'nationalId', header: 'TC Kimlik No', required: true },
  { key: 'firstName', header: 'Ad', required: true },
  { key: 'lastName', header: 'Soyad', required: true },
  { key: 'birthDate', header: 'Doğum Tarihi', required: true },
  { key: 'gender', header: 'Cinsiyet', required: false },
  { key: 'phone', header: 'GSM', required: true },
  { key: 'motherName', header: 'Anne Adı', required: false },
  { key: 'fatherName', header: 'Baba Adı', required: false },
  { key: 'email', header: 'e-Posta', required: false },
  { key: 'registrationNumber', header: 'Sicil No', required: false },
  { key: 'passportNumber', header: 'Pasaport No', required: false },
  { key: 'company', header: 'Firma', required: false },
  { key: 'occupation', header: 'Meslek', required: false },
  { key: 'homePhone', header: 'Ev Tel', required: false },
  { key: 'addressLine', header: 'Adres', required: false },
  { key: 'notes', header: 'Not', required: false },
] as const;

export type ImportColumnKey = (typeof IMPORT_COLUMNS)[number]['key'];
export type RawRow = Partial<Record<ImportColumnKey, unknown>>;

export interface ImportLookups {
  /** Company id by folded name or by tax number. */
  companyByKey: Map<string, { id: string; name: string }>;
  /** Occupation id by folded name or by code. */
  occupationByKey: Map<string, { id: string; name: string }>;
  /** National ids already registered in the tenant (live rows). */
  existingNationalIds: Set<string>;
}

export interface ParsedEmployee {
  nationalId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender?: Gender;
  phone: string;
  motherName?: string;
  fatherName?: string;
  email?: string;
  registrationNumber?: string;
  passportNumber?: string;
  companyId?: string;
  occupationId?: string;
  homePhone?: string;
  addressLine?: string;
  notes?: string;
}

export interface ParsedRow {
  /** 1-based row number in the sheet (header excluded → first data row is 2). */
  row: number;
  status: RowStatus;
  errors: string[];
  /** Resolved names for the preview table. */
  display: { fullName: string; nationalId: string; company?: string; occupation?: string };
  employee: ParsedEmployee | null;
}

/** Common alternative spellings seen in exported HR lists. */
export const HEADER_ALIASES: Record<string, ImportColumnKey> = {
  tckimlikno: 'nationalId',
  tcno: 'nationalId',
  tckn: 'nationalId',
  kimlikno: 'nationalId',
  adi: 'firstName',
  isim: 'firstName',
  soyadi: 'lastName',
  dogumtarihi: 'birthDate',
  cinsiyet: 'gender',
  telefon: 'phone',
  ceptelefonu: 'phone',
  gsm: 'phone',
  eposta: 'email',
  email: 'email',
  mail: 'email',
  sicilno: 'registrationNumber',
  sicil: 'registrationNumber',
  pasaportno: 'passportNumber',
  firma: 'company',
  sirket: 'company',
  isveren: 'company',
  meslek: 'occupation',
  gorev: 'occupation',
  evtel: 'homePhone',
  evtelefonu: 'homePhone',
  adres: 'addressLine',
  not: 'notes',
  aciklama: 'notes',
  anneadi: 'motherName',
  babaadi: 'fatherName',
};

/** Employee headers → column keys (template headers, then the aliases above). */
export function mapHeaders(headers: unknown[]) {
  return mapSheetHeaders(
    headers,
    IMPORT_COLUMNS as ReadonlyArray<ImportColumn<ImportColumnKey>>,
    HEADER_ALIASES,
  );
}

const text = cellText;

/** Accepts Date cells, dd.mm.yyyy / dd/mm/yyyy, yyyy-mm-dd and Excel serial numbers. */
export function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + Math.round(value) * 86_400_000).toISOString().slice(0, 10);
  }
  const s = text(value);
  let m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s);
  if (m) return toIso(Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return toIso(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

function toIso(y: number, mo: number, d: number): string | null {
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d)
    return null;
  return date.toISOString().slice(0, 10);
}

export function parseGender(value: unknown): Gender | null | undefined {
  const s = foldKey(text(value));
  if (!s) return undefined;
  if (['e', 'erkek', 'male', 'm', 'bay'].includes(s)) return 'MALE';
  if (['k', 'kadin', 'female', 'f', 'bayan'].includes(s)) return 'FEMALE';
  return null;
}

/** "ayşe nur" / "YILMAZ" → "Ayşe Nur" / "Yılmaz" with Turkish casing rules; hyphenated parts kept. */
export function titleCase(value: string): string {
  return normalizePersonName(value)
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) =>
          part
            ? part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1).toLocaleLowerCase('tr-TR')
            : part,
        )
        .join('-'),
    )
    .join(' ');
}

/** Digits only; a leading 0 or +90 / 90 country prefix is dropped by normalizeGsm. */
function digits(value: unknown): string {
  return text(value).replace(/\D/g, '');
}

/** Validates one raw row and resolves references; never throws. */
export function parseRow(
  row: RawRow,
  rowNumber: number,
  lookups: ImportLookups,
  seenInFile: Set<string>,
): ParsedRow {
  const errors: string[] = [];
  const nationalId = digits(row.nationalId);
  const firstName = titleCase(text(row.firstName));
  const lastName = titleCase(text(row.lastName));
  const display = {
    fullName: `${firstName} ${lastName}`.trim() || '—',
    nationalId: nationalId || '—',
  } as ParsedRow['display'];

  if (!nationalId) errors.push('TC Kimlik No boş');
  else if (!isValidTurkishId(nationalId)) errors.push('TC Kimlik No geçersiz');
  if (!firstName) errors.push('Ad boş');
  if (!lastName) errors.push('Soyad boş');

  const birthRaw = row.birthDate;
  const birthDate = text(birthRaw) === '' ? null : parseDate(birthRaw);
  if (!birthDate)
    errors.push(text(birthRaw) === '' ? 'Doğum tarihi boş' : 'Doğum tarihi okunamadı (gg.aa.yyyy)');
  else if (birthDate > new Date().toISOString().slice(0, 10)) errors.push('Doğum tarihi gelecekte');

  const phone = normalizeGsm(text(row.phone));
  if (!phone) errors.push('GSM boş');
  else if (!isValidGsm(phone)) errors.push('GSM geçersiz (5XX XXX XX XX)');

  const gender = parseGender(row.gender);
  if (gender === null) errors.push('Cinsiyet E/K olmalı');

  const email = text(row.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('e-Posta geçersiz');

  const homePhone = digits(row.homePhone);
  if (homePhone && !isValidLandline(homePhone)) errors.push('Ev Tel geçersiz');

  const passportNumber = text(row.passportNumber).toUpperCase();
  if (passportNumber && !/^[A-Z0-9]{5,20}$/.test(passportNumber))
    errors.push('Pasaport No geçersiz');

  let companyId: string | undefined;
  const companyText = text(row.company);
  if (companyText) {
    const company =
      lookups.companyByKey.get(foldKey(companyText)) ??
      lookups.companyByKey.get(digits(companyText));
    if (company) {
      companyId = company.id;
      display.company = company.name;
    } else errors.push(`Firma bulunamadı: ${companyText}`);
  }

  let occupationId: string | undefined;
  const occupationText = text(row.occupation);
  if (occupationText) {
    const occupation = lookups.occupationByKey.get(foldKey(occupationText));
    if (occupation) {
      occupationId = occupation.id;
      display.occupation = occupation.name;
    } else errors.push(`Meslek bulunamadı: ${occupationText}`);
  }

  let status: RowStatus = errors.length > 0 ? 'error' : 'ok';
  if (status === 'ok') {
    if (seenInFile.has(nationalId)) {
      status = 'duplicate';
      errors.push('Aynı TC Kimlik No dosyada birden fazla');
    } else if (lookups.existingNationalIds.has(nationalId)) {
      status = 'exists';
      errors.push('Bu TC Kimlik No zaten kayıtlı');
    }
    seenInFile.add(nationalId);
  }

  const employee: ParsedEmployee | null =
    status === 'ok'
      ? {
          nationalId,
          firstName,
          lastName,
          birthDate: birthDate!,
          ...(gender ? { gender } : {}),
          phone,
          ...(text(row.motherName) ? { motherName: titleCase(text(row.motherName)) } : {}),
          ...(text(row.fatherName) ? { fatherName: titleCase(text(row.fatherName)) } : {}),
          ...(email ? { email: email.toLowerCase() } : {}),
          ...(text(row.registrationNumber)
            ? { registrationNumber: text(row.registrationNumber) }
            : {}),
          ...(passportNumber ? { passportNumber } : {}),
          ...(companyId ? { companyId } : {}),
          ...(occupationId ? { occupationId } : {}),
          ...(homePhone ? { homePhone } : {}),
          ...(text(row.addressLine) ? { addressLine: text(row.addressLine).slice(0, 500) } : {}),
          ...(text(row.notes) ? { notes: text(row.notes).slice(0, 1000) } : {}),
        }
      : null;

  return { row: rowNumber, status, errors, display, employee };
}
