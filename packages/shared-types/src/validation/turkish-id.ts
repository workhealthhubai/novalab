/**
 * T.C. Kimlik Numarası (Turkish national identity number) validation.
 *
 * Rules: exactly 11 digits, first digit not 0,
 *   d10 = ((d1+d3+d5+d7+d9) * 7 - (d2+d4+d6+d8)) mod 10,
 *   d11 = (d1+...+d10) mod 10.
 * Catches the vast majority of typos before anything is sent to a verification service.
 */
export function isValidTurkishId(value: string | null | undefined): boolean {
  if (!value || !/^[1-9]\d{10}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const odd = digits[0]! + digits[2]! + digits[4]! + digits[6]! + digits[8]!;
  const even = digits[1]! + digits[3]! + digits[5]! + digits[7]!;
  const tenth = (((odd * 7 - even) % 10) + 10) % 10;
  if (tenth !== digits[9]) return false;
  const eleventh = digits.slice(0, 10).reduce((sum, d) => sum + d, 0) % 10;
  return eleventh === digits[10];
}
