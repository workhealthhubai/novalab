import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;
const SHEET_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'text/plain',
  'application/octet-stream',
]);

export interface UploadedSheetLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ImportColumn<K extends string> {
  key: K;
  header: string;
  required: boolean;
}

export interface SheetRead<K extends string> {
  rows: Array<Partial<Record<K, unknown>>>;
  columns: { unknown: string[]; missing: string[] };
}

/** Folds a header/name for matching: Turkish lower-case, accents stripped, non-alphanumerics dropped. */
export function foldKey(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '');
}

/** Cell → trimmed string; objects other than Date are ignored (never '[object Object]'). */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    return String(value);
  return '';
}

/** Maps sheet headers to column keys (template headers first, then aliases); unknown headers are reported. */
export function mapHeaders<K extends string>(
  headers: unknown[],
  columns: ReadonlyArray<ImportColumn<K>>,
  aliases: Record<string, K>,
): { mapping: Map<number, K>; unknown: string[]; missing: string[] } {
  const byHeader = new Map(columns.map((c) => [foldKey(c.header), c.key]));
  const mapping = new Map<number, K>();
  const unknown: string[] = [];
  headers.forEach((header, index) => {
    const label = cellText(header).replace(/\*/g, '').trim();
    const key = foldKey(label);
    if (!key) return;
    const column = byHeader.get(key) ?? aliases[key];
    if (column && ![...mapping.values()].includes(column)) mapping.set(index, column);
    else if (!column) unknown.push(label);
  });
  const mapped = new Set(mapping.values());
  const missing = columns.filter((c) => c.required && !mapped.has(c.key)).map((c) => c.header);
  return { mapping, unknown, missing };
}

/** Parses the first sheet of an uploaded workbook/CSV into keyed rows; throws 400s for unusable files. */
export function readSheet<K extends string>(
  file: UploadedSheetLike | undefined,
  columns: ReadonlyArray<ImportColumn<K>>,
  aliases: Record<string, K>,
): SheetRead<K> {
  if (!file) throw new BadRequestException({ message: 'Missing file', errorCode: 'FILE_REQUIRED' });
  const ext = file.originalname.toLowerCase().split('.').pop();
  if (!['xlsx', 'xls', 'csv'].includes(ext ?? '') || !SHEET_MIME.has(file.mimetype)) {
    throw new BadRequestException({
      message: 'Only .xlsx, .xls or .csv files are accepted',
      errorCode: 'UNSUPPORTED_FILE_TYPE',
    });
  }
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(file.buffer, { type: 'buffer', cellDates: true, raw: false });
  } catch {
    throw new BadRequestException({
      message: 'File could not be read',
      errorCode: 'FILE_UNREADABLE',
    });
  }
  const sheetName = book.SheetNames[0];
  const sheet = sheetName ? book.Sheets[sheetName] : undefined;
  if (!sheet)
    throw new BadRequestException({ message: 'Workbook has no sheet', errorCode: 'EMPTY_FILE' });
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });
  const [headerRow = [], ...dataRows] = matrix;
  const { mapping, unknown, missing } = mapHeaders(headerRow, columns, aliases);
  if (missing.length > 0) {
    throw new BadRequestException({
      message: `Missing required columns: ${missing.join(', ')}`,
      errorCode: 'MISSING_COLUMNS',
      details: missing,
    });
  }
  if (dataRows.length === 0)
    throw new BadRequestException({ message: 'No data rows', errorCode: 'EMPTY_FILE' });
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException({
      message: `At most ${MAX_IMPORT_ROWS} rows per file`,
      errorCode: 'TOO_MANY_ROWS',
    });
  }
  const rows = dataRows.map((cells) => {
    const row: Partial<Record<K, unknown>> = {};
    for (const [index, key] of mapping) row[key] = cells[index];
    return row;
  });
  return { rows, columns: { unknown, missing } };
}

/** Workbook buffer with the template headers (required ones starred) and one example row. */
export function buildTemplate<K extends string>(
  columns: ReadonlyArray<ImportColumn<K>>,
  example: string[],
  sheetName: string,
): Buffer {
  const headers = columns.map((c) => (c.required ? `${c.header} *` : c.header));
  const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
  sheet['!cols'] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export type RowStatus = 'ok' | 'error' | 'exists' | 'duplicate';

export interface ParseSummary {
  total: number;
  ok: number;
  error: number;
  exists: number;
  duplicate: number;
}

export function summarize(rows: ReadonlyArray<{ status: RowStatus }>): ParseSummary {
  return rows.reduce(
    (acc, row) => ({ ...acc, total: acc.total + 1, [row.status]: acc[row.status] + 1 }),
    { total: 0, ok: 0, error: 0, exists: 0, duplicate: 0 },
  );
}
