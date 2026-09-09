import type { ProtocolItemType, TestCategory } from '@osgb/shared-types';
import { z } from 'zod';
import type { TestPackage, TestPackageInput } from '@/types/test-package';

const money = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || /^\d{1,8}([.,]\d{1,2})?$/.test(v),
    'Fiyat: en fazla 2 ondalık (örn. 950,00)',
  );

export const packageSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Kod en az 2 karakter olmalı')
    .max(30)
    .regex(/^[A-Za-z0-9 _.\-ığüşöçİĞÜŞÖÇ]+$/, 'Kod harf, rakam, tire ve alt çizgi içerebilir'),
  name: z.string().trim().min(2, 'Paket adı en az 2 karakter olmalı').max(200),
  description: z.string().trim().max(500),
  price: money,
  vatRate: z.enum(['0', '1', '10', '20']),
  isActive: z.boolean(),
  sortOrder: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{1,5}$/.test(v), 'Sayı girin'),
  testIds: z.array(z.string()).min(1, 'En az bir tetkik seçin'),
});
export type PackageFormValues = z.infer<typeof packageSchema>;

export const emptyPackageForm: PackageFormValues = {
  code: '',
  name: '',
  description: '',
  price: '',
  vatRate: '20',
  isActive: true,
  sortOrder: '',
  testIds: [],
};

export function toPackageForm(p: TestPackage): PackageFormValues {
  return {
    code: p.code,
    name: p.name,
    description: p.description ?? '',
    price: p.price === null ? '' : Number(p.price).toFixed(2).replace('.', ','),
    vatRate: String(p.vatRate) as PackageFormValues['vatRate'],
    isActive: p.isActive,
    sortOrder: String(p.sortOrder),
    testIds: p.items.map((i) => i.testId),
  };
}

export function toPackageInput(values: PackageFormValues): TestPackageInput {
  return {
    code: values.code,
    name: values.name,
    description: values.description || null,
    price: values.price.trim() === '' ? null : Number(values.price.replace(',', '.')),
    vatRate: Number(values.vatRate),
    isActive: values.isActive,
    sortOrder: values.sortOrder.trim() === '' ? 0 : Number(values.sortOrder),
    items: values.testIds.map((testId) => ({ testId, quantity: 1 })),
  };
}

/** Protocol item types a package implies: one per distinct test category (OTHER has no screen). */
export function packageProtocolItems(p: Pick<TestPackage, 'items'>): ProtocolItemType[] {
  const seen = new Set<ProtocolItemType>();
  for (const item of p.items) {
    const category: TestCategory = item.test.category;
    if (category !== 'OTHER') seen.add(category);
  }
  return [...seen];
}
