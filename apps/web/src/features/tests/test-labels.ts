import type { TestCategory } from '@osgb/shared-types';

export const TEST_CATEGORY_LABELS: Record<TestCategory, string> = {
  RADIOLOGY: 'Radyoloji',
  AUDIOMETRY: 'Odyometri',
  ECG: 'EKG',
  SPIROMETRY: 'SFT',
  EYE: 'Göz',
  PNEUMOCONIOSIS: 'Pnömokonyoz',
  LAB: 'Lab. Tahlilleri',
  HEALTH_REPORT: 'Sağlık Raporu',
  ISG_REPORT: 'İSG Raporu',
  OTHER: 'Diğer',
};

export const TEST_CATEGORIES = Object.keys(TEST_CATEGORY_LABELS) as TestCategory[];

export const VAT_RATES = [0, 1, 10, 20] as const;

const currency = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
});

export function formatPrice(value: string | number): string {
  return currency.format(typeof value === 'string' ? Number(value) : value);
}

/** Price including VAT, rounded to kuruş. */
export function grossPrice(unitPrice: string | number, vatRate: number): number {
  const net = typeof unitPrice === 'string' ? Number(unitPrice) : unitPrice;
  return Math.round(net * (1 + vatRate / 100) * 100) / 100;
}
