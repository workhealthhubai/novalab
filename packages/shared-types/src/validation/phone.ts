/** Keeps digits only and strips a leading country code / trunk prefix (+90, 90, 0). */
export function normalizeGsm(value: string | null | undefined): string {
  if (!value) return '';
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return digits;
}

/** Turkish mobile number: 10 digits starting with 5 (5XX XXX XX XX). */
export function isValidGsm(value: string | null | undefined): boolean {
  return /^5\d{9}$/.test(normalizeGsm(value));
}

/** "5321234567" -> "532 123 45 67" (partial input is formatted progressively for masks). */
export function formatGsm(value: string | null | undefined): string {
  const digits = normalizeGsm(value).slice(0, 10);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)];
  return parts.filter(Boolean).join(' ');
}

/** Landline (Ev Tel): 10 digits, area code 2XX-4XX. */
export function isValidLandline(value: string | null | undefined): boolean {
  return /^[2-4]\d{9}$/.test(normalizeGsm(value));
}
