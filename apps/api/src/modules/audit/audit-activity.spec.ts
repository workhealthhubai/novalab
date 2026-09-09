import { categoryOf, isTechnical } from './audit-activity';

describe('audit activity categories', () => {
  it('maps rows to categories', () => {
    expect(categoryOf({ action: 'LOGIN', entityType: 'Auth', metadata: null })).toBe('SESSION');
    expect(categoryOf({ action: 'CREATE', entityType: 'Employee', metadata: null })).toBe(
      'PATIENT',
    );
    expect(categoryOf({ action: 'UPDATE', entityType: 'AudiometryTest', metadata: null })).toBe(
      'TEST',
    );
    expect(
      categoryOf({ action: 'MEDICAL_DATA_ACCESS', entityType: 'Examination', metadata: null }),
    ).toBe('ACCESS');
    expect(
      categoryOf({
        action: 'GET /api/x',
        entityType: 'Employee',
        metadata: { outcome: 'FAILURE' },
      }),
    ).toBe('FAILURE');
    expect(categoryOf({ action: 'UPDATE', entityType: 'Examination', metadata: null })).toBe(
      'REPORT',
    );
    expect(categoryOf({ action: 'CREATE', entityType: 'Physician', metadata: null })).toBe(
      'DEFINITION',
    );
    expect(categoryOf({ action: 'CREATE', entityType: 'Unknown', metadata: null })).toBe('OTHER');
  });

  it('separates technical request rows from business actions', () => {
    expect(isTechnical({ action: 'GET /api/employees' })).toBe(true);
    expect(isTechnical({ action: 'CREATE' })).toBe(false);
  });
});
