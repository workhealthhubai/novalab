import { describe, expect, it } from 'vitest';
import { emptyPatientForm, patientSchema, toPatientInput } from './patient-schema';

const valid = {
  ...emptyPatientForm,
  companyId: 'c1',
  nationalId: '10000000146',
  firstName: '  Ayşe   Gül ',
  lastName: 'Yılmaz',
  birthDate: '1990-01-15',
  gender: 'FEMALE' as const,
  phone: '0532 123 45 67',
  email: 'ayse@example.com',
};

describe('patientSchema', () => {
  it('accepts a valid patient and normalises names/phone in the payload', () => {
    const parsed = patientSchema.parse(valid);
    expect(parsed.firstName).toBe('Ayşe Gül');
    const input = toPatientInput(parsed);
    expect(input.phone).toBe('5321234567');
    expect(input.gender).toBe('FEMALE');
    expect(input.registrationNumber).toBeUndefined();
    expect(input.addressProvinceId).toBeNull();
  });

  it('rejects an invalid T.C. Kimlik No, a bad GSM and a missing birth date', () => {
    const result = patientSchema.safeParse({
      ...valid,
      nationalId: '10000000147',
      phone: '212 123 45 67',
      birthDate: '',
    });
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['nationalId', 'phone', 'birthDate']));
  });

  it('requires the T.C. Kimlik No even when a passport number is given', () => {
    const result = patientSchema.safeParse({
      ...valid,
      nationalId: '',
      passportNumber: 'U1234567',
    });
    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((i) => i.message)).toContain(
      'T.C. Kimlik No zorunludur',
    );
    expect(patientSchema.safeParse({ ...valid, passportNumber: 'U-1234' }).success).toBe(false);
  });

  it('rejects future birth dates and malformed e-mails', () => {
    expect(patientSchema.safeParse({ ...valid, birthDate: '2999-01-01' }).success).toBe(false);
    expect(patientSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });
});
