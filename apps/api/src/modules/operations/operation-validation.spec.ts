import type { OperationInput } from '@osgb/shared-types';
import { isOperationKind, isLocked, moneyCents, validateOperation } from './operation-validation';
const input: OperationInput = {
  title: 'Eylül hizmeti',
  date: '2026-09-12',
  status: 'Bekliyor',
  fields: {
    physicianId: '11111111-1111-4111-8111-111111111111',
    period: '2026-09',
    quantity: '3',
    unitPrice: '0.29',
  },
};
describe('Operational register validation', () => {
  it('calculates monetary totals with integer cents', () => {
    expect(moneyCents('0.29')).toBe(29);
    expect(validateOperation('payouts', input).amountCents).toBe(87);
  });
  it.each(['0', '-1', '1.234', 'Infinity', '1e3', '99999999999'])(
    'rejects invalid money %s',
    (amount) => expect(() => moneyCents(amount)).toThrow(),
  );
  it('rejects total overflow and fractional quantities', () => {
    expect(() =>
      validateOperation('payouts', {
        ...input,
        fields: { ...input.fields, quantity: '100000', unitPrice: '9999999' },
      }),
    ).toThrow();
    expect(() =>
      validateOperation('payouts', { ...input, fields: { ...input.fields, quantity: '1.5' } }),
    ).toThrow();
  });
  it('rejects impossible dates, arbitrary fields and unknown states', () => {
    expect(() => validateOperation('payouts', { ...input, date: '2026-02-30' })).toThrow();
    expect(() =>
      validateOperation('payouts', { ...input, fields: { ...input.fields, tenantId: 'foreign' } }),
    ).toThrow();
    expect(() => validateOperation('payouts', { ...input, status: 'approved' })).toThrow();
  });
  it('only recognizes explicitly declared modules', () => {
    expect(isOperationKind('__proto__')).toBe(false);
    expect(isOperationKind('constructor')).toBe(false);
    expect(isOperationKind('lab')).toBe(true);
  });
  it('locks completed reports and paid entries but permits template deactivation', () => {
    expect(isLocked('lab', 'Tamamlandı')).toBe(true);
    expect(isLocked('accounting', 'Ödendi')).toBe(true);
    expect(isLocked('templates', 'Aktif')).toBe(false);
  });
});
