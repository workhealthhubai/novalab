import { z } from 'zod';
import type { Occupation, OccupationInput } from '@/types/occupation';

export const occupationSchema = z.object({
  name: z.string().trim().min(2, 'Meslek adı en az 2 karakter olmalı').max(150),
  code: z
    .string()
    .trim()
    .max(20)
    .refine(
      (v) => v === '' || /^[A-Za-z0-9.-]+$/.test(v),
      'Kod harf, rakam, nokta ve tire içerebilir',
    ),
  description: z.string().trim().max(500, 'En fazla 500 karakter'),
  isActive: z.boolean(),
});
export type OccupationFormValues = z.infer<typeof occupationSchema>;

export const emptyOccupationForm: OccupationFormValues = {
  name: '',
  code: '',
  description: '',
  isActive: true,
};

export function toOccupationForm(o: Occupation): OccupationFormValues {
  return {
    name: o.name,
    code: o.code ?? '',
    description: o.description ?? '',
    isActive: o.isActive,
  };
}

export function toOccupationInput(values: OccupationFormValues): OccupationInput {
  return {
    name: values.name,
    code: values.code || null,
    description: values.description || null,
    isActive: values.isActive,
  };
}
