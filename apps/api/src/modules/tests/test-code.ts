const TURKISH_MAP: Record<string, string> = {
  İ: 'I',
  I: 'I',
  Ş: 'S',
  Ç: 'C',
  Ğ: 'G',
  Ö: 'O',
  Ü: 'U',
};

/**
 * Codes are stored upper-case ASCII without whitespace so "lab-hgb", "LAB HGB" and "Lab-Hgb" are
 * the same test and can be typed on any keyboard.
 */
export function normalizeTestCode(code: string): string {
  return code
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/[İIŞÇĞÖÜ]/g, (c) => TURKISH_MAP[c] ?? c)
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_.-]/g, '');
}
