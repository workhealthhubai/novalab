import { describe, expect, it } from 'vitest';
import { grossPrice } from './test-labels';
import { emptyTestForm, testSchema, toTestInput } from './test-schema';

describe('test definition schema', () => {
  it('accepts Turkish decimal input and maps blanks to null/defaults', () => {
    const parsed = testSchema.parse({
      ...emptyTestForm,
      code: 'lab-hgb',
      name: 'Hemogram',
      unitPrice: '150,50',
      vatRate: '10',
    });
    expect(toTestInput(parsed)).toMatchObject({
      code: 'lab-hgb',
      unitPrice: 150.5,
      vatRate: 10,
      durationMinutes: null,
      sampleType: null,
      sortOrder: 0,
    });
  });

  it('rejects malformed prices and codes', () => {
    expect(testSchema.safeParse({ ...emptyTestForm, code: 'A', name: 'X' }).success).toBe(false);
    expect(
      testSchema.safeParse({
        ...emptyTestForm,
        code: 'LAB-1',
        name: 'Hemogram',
        unitPrice: '1.2.3',
      }).success,
    ).toBe(false);
    expect(
      testSchema.safeParse({ ...emptyTestForm, code: 'LAB/1', name: 'Hemogram' }).success,
    ).toBe(false);
  });

  it('computes the gross price rounded to kuruş', () => {
    expect(grossPrice('150.50', 20)).toBe(180.6);
    expect(grossPrice(33.33, 10)).toBe(36.66);
  });
});
