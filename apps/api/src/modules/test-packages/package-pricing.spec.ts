import { packageTotals } from './package-pricing';

describe('packageTotals', () => {
  const items = [
    { quantity: 1, unitPrice: 100, vatRate: 10 },
    { quantity: 2, unitPrice: 50.25, vatRate: 20 },
  ];

  it('sums item prices with their own VAT rates when the package has no price', () => {
    expect(packageTotals(items, null, 20)).toEqual({
      net: 200.5,
      gross: 230.6,
      itemsNet: 200.5,
      discount: 0,
    });
  });

  it('uses the package price and VAT rate when set and reports the discount', () => {
    expect(packageTotals(items, 180, 10)).toEqual({
      net: 180,
      gross: 198,
      itemsNet: 200.5,
      discount: 20.5,
    });
  });
});
