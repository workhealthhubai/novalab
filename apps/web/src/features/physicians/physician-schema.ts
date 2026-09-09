import { z } from 'zod';
import type { Physician, PhysicianInput } from '@/types/physician';

const text = (max: number) => z.string().trim().max(max, `En fazla ${max} karakter`);

export const physicianSchema = z.object({
  title: text(30),
  firstName: z.string().trim().min(1, 'Ad zorunludur').max(100),
  lastName: z.string().trim().min(1, 'Soyad zorunludur').max(100),
  specialty: text(100),
  diplomaNumber: text(50),
  diplomaRegistrationNumber: text(50),
  certificateNumber: text(50),
  phone: text(30),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Geçerli bir e-posta girin'),
  userId: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  notes: text(1000),
});
export type PhysicianFormValues = z.infer<typeof physicianSchema>;

export const emptyPhysicianForm: PhysicianFormValues = {
  title: 'Dr.',
  firstName: '',
  lastName: '',
  specialty: 'İşyeri Hekimi',
  diplomaNumber: '',
  diplomaRegistrationNumber: '',
  certificateNumber: '',
  phone: '',
  email: '',
  userId: '',
  status: 'ACTIVE',
  notes: '',
};

export function toPhysicianForm(p: Physician): PhysicianFormValues {
  return {
    title: p.title ?? '',
    firstName: p.firstName,
    lastName: p.lastName,
    specialty: p.specialty ?? '',
    diplomaNumber: p.diplomaNumber ?? '',
    diplomaRegistrationNumber: p.diplomaRegistrationNumber ?? '',
    certificateNumber: p.certificateNumber ?? '',
    phone: p.phone ?? '',
    email: p.email ?? '',
    userId: p.userId ?? '',
    status: p.status,
    notes: p.notes ?? '',
  };
}

/** Every text field is sent ('' clears on the API); an empty user selection unlinks. */
export function toPhysicianInput(values: PhysicianFormValues): PhysicianInput {
  const { userId, ...rest } = values;
  return { ...rest, userId: userId || null };
}
