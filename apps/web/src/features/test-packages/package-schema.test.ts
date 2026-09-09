import { describe, expect, it } from 'vitest';
import type { TestPackage } from '@/types/test-package';
import {
  emptyPackageForm,
  packageProtocolItems,
  packageSchema,
  toPackageInput,
} from './package-schema';

describe('test package schema', () => {
  it('requires at least one test and maps a blank price to null (= sum of items)', () => {
    expect(
      packageSchema.safeParse({ ...emptyPackageForm, code: 'PKT-1', name: 'Paket' }).success,
    ).toBe(false);
    const parsed = packageSchema.parse({
      ...emptyPackageForm,
      code: 'PKT-1',
      name: 'Paket',
      testIds: ['t1', 't2'],
    });
    expect(toPackageInput(parsed)).toMatchObject({
      price: null,
      vatRate: 20,
      items: [
        { testId: 't1', quantity: 1 },
        { testId: 't2', quantity: 1 },
      ],
    });
    expect(toPackageInput({ ...parsed, price: '950,50' }).price).toBe(950.5);
  });

  it('derives protocol item types from distinct test categories, skipping OTHER', () => {
    const pkg = {
      items: [
        { test: { category: 'LAB' } },
        { test: { category: 'LAB' } },
        { test: { category: 'RADIOLOGY' } },
        { test: { category: 'OTHER' } },
      ],
    } as unknown as Pick<TestPackage, 'items'>;
    expect(packageProtocolItems(pkg)).toEqual(['LAB', 'RADIOLOGY']);
  });
});
