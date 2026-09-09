import { z } from 'zod';
import type { TestDefinition, TestDefinitionInput } from '@/types/test-definition';

const text = (max: number) => z.string().trim().max(max, `En fazla ${max} karakter`);
const money = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || /^\d{1,8}([.,]\d{1,2})?$/.test(v),
    'Fiyat: en fazla 2 ondalık (örn. 150,50)',
  );

export const testSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Kod en az 2 karakter olmalı')
    .max(30)
    .regex(/^[A-Za-z0-9 _.\-ığüşöçİĞÜŞÖÇ]+$/, 'Kod harf, rakam, tire ve alt çizgi içerebilir'),
  name: z.string().trim().min(2, 'Tetkik adı en az 2 karakter olmalı').max(200),
  category: z.enum([
    'RADIOLOGY',
    'AUDIOMETRY',
    'ECG',
    'SPIROMETRY',
    'EYE',
    'PNEUMOCONIOSIS',
    'LAB',
    'HEALTH_REPORT',
    'ISG_REPORT',
    'OTHER',
  ]),
  unitPrice: money,
  vatRate: z.enum(['0', '1', '10', '20']),
  durationMinutes: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{1,4}$/.test(v), 'Dakika girin'),
  sampleType: text(50),
  referenceRange: text(100),
  unit: text(20),
  isActive: z.boolean(),
  sortOrder: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{1,5}$/.test(v), 'Sayı girin'),
  notes: text(1000),
});
export type TestFormValues = z.infer<typeof testSchema>;

export const emptyTestForm: TestFormValues = {
  code: '',
  name: '',
  category: 'LAB',
  unitPrice: '',
  vatRate: '20',
  durationMinutes: '',
  sampleType: '',
  referenceRange: '',
  unit: '',
  isActive: true,
  sortOrder: '',
  notes: '',
};

export function toTestForm(t: TestDefinition): TestFormValues {
  return {
    code: t.code,
    name: t.name,
    category: t.category,
    unitPrice: Number(t.unitPrice).toFixed(2).replace('.', ','),
    vatRate: String(t.vatRate) as TestFormValues['vatRate'],
    durationMinutes: t.durationMinutes === null ? '' : String(t.durationMinutes),
    sampleType: t.sampleType ?? '',
    referenceRange: t.referenceRange ?? '',
    unit: t.unit ?? '',
    isActive: t.isActive,
    sortOrder: String(t.sortOrder),
    notes: t.notes ?? '',
  };
}

const toNumber = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(',', '.')));

export function toTestInput(values: TestFormValues): TestDefinitionInput {
  return {
    code: values.code,
    name: values.name,
    category: values.category,
    unitPrice: toNumber(values.unitPrice) ?? 0,
    vatRate: Number(values.vatRate),
    durationMinutes: toNumber(values.durationMinutes) ?? null,
    sampleType: values.sampleType || null,
    referenceRange: values.referenceRange || null,
    unit: values.unit || null,
    isActive: values.isActive,
    sortOrder: toNumber(values.sortOrder) ?? 0,
    notes: values.notes || null,
  };
}
