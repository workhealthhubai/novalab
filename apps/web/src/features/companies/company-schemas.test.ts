import { describe, expect, it } from 'vitest';
import {
  companySchema,
  toCompanyInput,
  toWorkplaceInput,
  workplaceSchema,
} from './company-schemas';

describe('company schemas', () => {
  it('requires a name and validates tax number / e-mail formats', () => {
    expect(
      companySchema.safeParse({
        name: 'A',
        taxNumber: '',
        sgkRegistrationNumber: '',
        hazardClass: 'HAZARDOUS',
        address: '',
        phone: '',
        email: '',
      }).success,
    ).toBe(false);
    const bad = companySchema.safeParse({
      name: 'Örnek A.Ş.',
      taxNumber: '12',
      sgkRegistrationNumber: '',
      hazardClass: 'HAZARDOUS',
      address: '',
      phone: '',
      email: 'x',
    });
    expect(bad.success).toBe(false);
    const paths = bad.success ? [] : bad.error.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['taxNumber', 'email']));
  });

  it('maps blank optional fields to undefined so the API does not receive empty strings', () => {
    const parsed = companySchema.parse({
      name: ' Örnek A.Ş. ',
      taxNumber: '1234567890',
      sgkRegistrationNumber: '',
      hazardClass: 'LESS_HAZARDOUS',
      address: '',
      phone: '',
      email: '',
    });
    expect(toCompanyInput(parsed)).toEqual({
      name: 'Örnek A.Ş.',
      hazardClass: 'LESS_HAZARDOUS',
      taxNumber: '1234567890',
    });
  });

  it('parses the employee count and drops an empty branch', () => {
    const parsed = workplaceSchema.parse({
      name: 'Merkez',
      branchId: '',
      sgkRegistrationNumber: '',
      hazardClass: 'VERY_HAZARDOUS',
      naceCode: '',
      address: '',
      employeeCount: '42',
    });
    expect(toWorkplaceInput('c1', parsed)).toEqual({
      companyId: 'c1',
      name: 'Merkez',
      hazardClass: 'VERY_HAZARDOUS',
      employeeCount: 42,
    });
  });
});
