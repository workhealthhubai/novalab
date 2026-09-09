import {
  formatGsm,
  isValidGsm,
  isValidTurkishId,
  normalizeGsm,
  normalizePersonName,
} from '@osgb/shared-types';

describe('identity validation helpers', () => {
  it('validates T.C. Kimlik No check digits', () => {
    expect(isValidTurkishId('10000000146')).toBe(true);
    expect(isValidTurkishId('10000000147')).toBe(false); // last digit wrong
    expect(isValidTurkishId('01000000146')).toBe(false); // leading zero
    expect(isValidTurkishId('1000000014')).toBe(false); // 10 digits
    expect(isValidTurkishId('1000000014a')).toBe(false);
  });

  it('normalises and validates GSM numbers', () => {
    expect(normalizeGsm('+90 532 123 45 67')).toBe('5321234567');
    expect(normalizeGsm('0532 123 45 67')).toBe('5321234567');
    expect(isValidGsm('532 123 45 67')).toBe(true);
    expect(isValidGsm('212 123 45 67')).toBe(false);
    expect(formatGsm('53212')).toBe('532 12');
    expect(formatGsm('5321234567')).toBe('532 123 45 67');
  });

  it('normalises names while keeping Turkish characters', () => {
    expect(normalizePersonName('  Ayşe   Gül  ')).toBe('Ayşe Gül');
    expect(normalizePersonName('İbrahim\tÇağrı')).toBe('İbrahim Çağrı');
  });
});
