/**
 * ICAO 9303 TD1 MRZ parsing for Turkish ID cards. Pure functions shared by the API (tesseract
 * in Node) and the web client (tesseract.js in the browser).
 */
import type { Gender } from './enums.js';
import type { IdCardBarcode, IdCardScanFields, IdCardScanResult } from './identity.js';
import { isValidTurkishId } from './validation/turkish-id.js';

const MRZ_LINE_LENGTH = 30;
const WEIGHTS = [7, 3, 1];

function charValue(char: string): number {
  if (char === '<') return 0;
  if (char >= '0' && char <= '9') return char.charCodeAt(0) - 48;
  if (char >= 'A' && char <= 'Z') return char.charCodeAt(0) - 55;
  return 0;
}

/** ICAO 9303 check digit (weights 7-3-1). */
export function mrzCheckDigit(value: string): number {
  return (
    [...value].reduce((sum, char, index) => sum + charValue(char) * WEIGHTS[index % 3]!, 0) % 10
  );
}

function checks(value: string, digit: string): boolean {
  return /\d/.test(digit) && mrzCheckDigit(value) === Number(digit);
}

/** OCR confuses letters/digits inside numeric fields; map the usual suspects. */
function digitsOnly(value: string): string {
  return value
    .replace(/O/g, '0')
    .replace(/Q/g, '0')
    .replace(/D/g, '0')
    .replace(/[IL|]/g, '1')
    .replace(/Z/g, '2')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/G/g, '6');
}

function toIsoDate(yymmdd: string, kind: 'birth' | 'expiry'): string | undefined {
  const value = digitsOnly(yymmdd);
  if (!/^\d{6}$/.test(value)) return undefined;
  const yy = Number(value.slice(0, 2));
  const mm = value.slice(2, 4);
  const dd = value.slice(4, 6);
  const currentYY = new Date().getFullYear() % 100;
  const year = kind === 'expiry' ? 2000 + yy : yy > currentYY ? 1900 + yy : 2000 + yy;
  const iso = `${year}-${mm}-${dd}`;
  return Number.isNaN(Date.parse(iso)) ? undefined : iso;
}

/**
 * OCR often reads the "<" filler as L, K, C or E (especially with non-OCR-B fonts).
 * Filler is only expected in runs, so a run of 3+ identical filler-like letters is treated as "<".
 */
const FILLER_RUN = /([LKCE<])\1{2,}/g;

function restoreFiller(segment: string): string {
  return segment.replace(FILLER_RUN, (run) => '<'.repeat(run.length));
}

/** Digits never appear in MRZ names; map the usual OCR confusions back to letters. */
function lettersOnly(value: string): string {
  return value
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/2/g, 'Z')
    .replace(/5/g, 'S')
    .replace(/8/g, 'B')
    .replace(/6/g, 'G');
}

/** Short tokens made of the letters OCR produces for "<" filler (K, L, C, E, I) are noise, not names. */
function isFillerNoise(token: string): boolean {
  if (/^[KLC]{1,3}$/.test(token)) return true;
  return token.length <= 3 && /^[KLCEI]+$/.test(token) && (token.match(/[KLC]/g) ?? []).length >= 2;
}

function cleanName(segment: string): string {
  const tokens = restoreFiller(lettersOnly(segment)).split('<').filter(Boolean);
  const kept: string[] = [];
  for (const token of tokens) {
    if (isFillerNoise(token)) break; // everything after the first filler misread is padding
    kept.push(token);
  }
  return kept.join(' ');
}

/**
 * All plausible MRZ lines in raw OCR text: after stripping everything but [A-Z0-9<], MRZ lines
 * are ~30 characters. Other card text (headers, names) can produce similar-length lines, so the
 * caller scores consecutive triples and keeps the best one (see selectBestMrz).
 */
export function extractMrzLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.toUpperCase().replace(/[^A-Z0-9<]/g, ''))
    .filter((line) => line.length >= MRZ_LINE_LENGTH - 4 && line.length <= MRZ_LINE_LENGTH + 5);
}

/** How much of the parsed MRZ is trustworthy: passed check digits + key fields present. */
export function scoreMrz(result: IdCardScanResult): number {
  const checks = Object.values(result.checks).filter(Boolean).length;
  return (
    checks * 2 +
    (result.fields.nationalId ? 2 : 0) +
    (result.fields.lastName ? 1 : 0) +
    (result.fields.birthDate ? 1 : 0)
  );
}

/** Tries every consecutive triple of candidate lines and returns the best-scoring parse. */
export function selectBestMrz(text: string): IdCardScanResult {
  const candidates = extractMrzLines(text);
  if (candidates.length < 3) return parseTd1Mrz(candidates);
  let best: IdCardScanResult | null = null;
  for (let i = 0; i + 3 <= candidates.length; i += 1) {
    const parsed = parseTd1Mrz(candidates.slice(i, i + 3));
    if (!best || scoreMrz(parsed) > scoreMrz(best)) best = parsed;
  }
  return best!;
}

function fit(line: string): string {
  return line.padEnd(MRZ_LINE_LENGTH, '<').slice(0, MRZ_LINE_LENGTH);
}

/**
 * Parses a TD1 (ID-1 card) MRZ as printed on Turkish identity cards:
 *   line 1: I<TUR + document no (9) + check + optional data (contains the 11-digit TC no)
 *   line 2: birth (YYMMDD) + check + sex + expiry (YYMMDD) + check + nationality + optional + composite check
 *   line 3: SURNAME<<GIVEN<NAMES
 */
export function parseTd1Mrz(lines: string[]): IdCardScanResult {
  const warnings: string[] = [];
  if (lines.length < 3) {
    return {
      mrzValid: false,
      fields: {},
      checks: {},
      confidence: 0,
      rawLines: lines,
      warnings: ['MRZ satırları bulunamadı'],
    };
  }
  const [rawL1, rawL2, rawL3] = lines as [string, string, string];
  // Turkish cards leave line-2 optional data (pos 19-29) empty; OCR may misread that filler as
  // letters or even insert extra characters, so the field is rebuilt from the fixed prefix and
  // the trailing composite check digit.
  const l1 = fit(rawL1.slice(0, 15) + restoreFiller(rawL1.slice(15)));
  const l2 =
    rawL2.length >= 19 ? rawL2.slice(0, 18) + '<'.repeat(11) + rawL2.slice(-1) : fit(rawL2);
  const l3 = fit(rawL3);

  const documentNumber = l1.slice(5, 14).replace(/</g, '');
  const documentNumberChecksum = checks(l1.slice(5, 14), l1[14] ?? '');
  const optional1 = l1.slice(15, 30);
  const nationalIdMatch = digitsOnly(optional1).match(/\d{11}/);
  const nationalId = nationalIdMatch?.[0];
  const nationalIdChecksum = nationalId ? isValidTurkishId(nationalId) : undefined;

  const birthDate = toIsoDate(l2.slice(0, 6), 'birth');
  const birthDateChecksum = checks(digitsOnly(l2.slice(0, 6)), l2[6] ?? '');
  const sex = l2[7];
  const gender: Gender | undefined = sex === 'M' ? 'MALE' : sex === 'F' ? 'FEMALE' : undefined;
  const expiryDate = toIsoDate(l2.slice(8, 14), 'expiry');
  const expiryDateChecksum = checks(digitsOnly(l2.slice(8, 14)), l2[14] ?? '');
  const nationality = l2.slice(15, 18).replace(/</g, '') || undefined;
  const composite = l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29);
  const compositeChecksum = checks(composite, l2[29] ?? '');

  // The surname/given-names separator is "<<"; when OCR read one of them as a filler-like letter
  // ("YILMAZ<KAYSE"), repair the first single "<" followed by such a letter.
  const nameLine = /<<[A-Z]/.test(l3) ? l3 : l3.replace(/<([KLCE])(?=[A-Z])/, '<<');
  const [surnamePart = '', givenPart = ''] = nameLine.split('<<');
  const lastName = cleanName(surnamePart) || undefined;
  const firstName = cleanName(givenPart) || undefined;

  if (!nationalId) warnings.push('TC Kimlik No MRZ içinde bulunamadı');
  else if (!nationalIdChecksum) warnings.push('TC Kimlik No kontrol basamağı doğrulanamadı');
  if (!birthDateChecksum) warnings.push('Doğum tarihi kontrol basamağı doğrulanamadı');
  if (!documentNumberChecksum) warnings.push('Belge numarası kontrol basamağı doğrulanamadı');
  if (!compositeChecksum) warnings.push('MRZ bileşik kontrol basamağı doğrulanamadı');
  if (firstName || lastName)
    warnings.push('MRZ adları Türkçe karakter içermez (Ç, Ş, Ğ, İ, Ö, Ü); kontrol edin');

  const fields: IdCardScanFields = {
    nationalId,
    documentNumber: documentNumber || undefined,
    firstName,
    lastName,
    birthDate,
    gender,
    expiryDate,
    nationality,
  };
  const mrzValid = Boolean(
    nationalIdChecksum && birthDateChecksum && documentNumberChecksum && compositeChecksum,
  );
  return {
    mrzValid,
    fields,
    checks: {
      nationalIdChecksum,
      documentNumberChecksum,
      birthDateChecksum,
      expiryDateChecksum,
      compositeChecksum,
    },
    confidence: 0,
    rawLines: lines,
    warnings,
  };
}

/** Builds the three TD1 lines for a Turkish ID (used by tests and fixtures). */
export function buildTd1Mrz(input: {
  documentNumber: string;
  nationalId: string;
  birth: string;
  sex: 'M' | 'F';
  expiry: string;
  surname: string;
  givenNames: string;
}): string[] {
  const pad = (value: string, length: number) =>
    value.toUpperCase().replace(/ /g, '<').padEnd(length, '<').slice(0, length);
  const doc = pad(input.documentNumber, 9);
  const line1 = `I<TUR${doc}${mrzCheckDigit(doc)}<${pad(input.nationalId, 14)}`;
  const line2Prefix = `${input.birth}${mrzCheckDigit(input.birth)}${input.sex}${input.expiry}${mrzCheckDigit(input.expiry)}TUR${'<'.repeat(11)}`;
  const composite = mrzCheckDigit(
    line1.slice(5, 30) +
      line2Prefix.slice(0, 7) +
      line2Prefix.slice(8, 15) +
      line2Prefix.slice(18, 29),
  );
  const line2 = `${line2Prefix}${composite}`;
  const line3 = pad(`${input.surname}<<${input.givenNames}`, 30);
  return [line1, line2, line3];
}

const DOCUMENT_NUMBER = /^[A-Z][0-9]{2}[A-Z][0-9]{5}$/;

/**
 * Combines the MRZ parse with the card barcode. The barcode is a second source for the document
 * number: it confirms the MRZ value, or replaces a missing/unchecked one.
 */
export function mergeBarcode(
  result: IdCardScanResult,
  barcode: IdCardBarcode | null,
): IdCardScanResult {
  if (!barcode) return result;
  const text = barcode.text.toUpperCase();
  const merged: IdCardScanResult = {
    ...result,
    barcode,
    fields: { ...result.fields },
    checks: { ...result.checks },
    warnings: [...result.warnings],
  };
  if (!DOCUMENT_NUMBER.test(text)) return merged;
  if (merged.fields.documentNumber && merged.checks.documentNumberChecksum) {
    merged.checks.documentNumberBarcodeMatch = merged.fields.documentNumber === text;
    if (!merged.checks.documentNumberBarcodeMatch)
      merged.warnings.push('Barkoddaki belge numarası MRZ ile eşleşmiyor');
  } else {
    merged.fields.documentNumber = text;
    merged.checks.documentNumberBarcodeMatch = true;
    merged.warnings = merged.warnings.filter((w) => !w.startsWith('Belge numarası'));
    merged.warnings.push('Belge numarası barkoddan alındı');
  }
  return merged;
}
