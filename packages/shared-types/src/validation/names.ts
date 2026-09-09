/**
 * Normalises a person name for storage: trims, collapses repeated whitespace,
 * keeps Turkish characters untouched (no case folding - official records vary).
 */
export function normalizePersonName(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\s+/g, ' ').trim();
}

/** Upper-cases with Turkish rules (i -> İ, ı -> I) for comparisons with official records. */
export function toTurkishUpper(value: string): string {
  return value.toLocaleUpperCase('tr-TR');
}
