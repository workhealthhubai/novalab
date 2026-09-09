import { z } from 'zod';
import {
  isValidGsm,
  isValidLandline,
  isValidTurkishId,
  normalizeGsm,
  normalizePersonName,
} from '@osgb/shared-types';
import type { PatientInput } from '@/types/patient';

const optionalText = (max: number) =>
  z.string().trim().max(max, `En fazla ${max} karakter`).optional().or(z.literal(''));

/** Form-level validation mirrors the API DTO so most mistakes are caught before a request is made. */
export const patientSchema = z.object({
  /** Optional: the workplace can be assigned after registration. */
  companyId: z.string(),
  nationalId: z
    .string()
    .trim()
    .min(1, 'T.C. Kimlik No zorunludur')
    .refine(isValidTurkishId, 'Geçersiz T.C. Kimlik No (11 hane, kontrol basamakları uyuşmuyor)'),
  registrationNumber: optionalText(50),
  passportNumber: z
    .string()
    .trim()
    .max(20)
    .refine(
      (v) => v === '' || /^[A-Za-z0-9]+$/.test(v),
      'Pasaport No yalnızca harf ve rakam içerebilir',
    )
    .optional()
    .or(z.literal('')),
  firstName: z
    .string()
    .transform(normalizePersonName)
    .pipe(z.string().min(2, 'Ad en az 2 karakter olmalı').max(100)),
  lastName: z
    .string()
    .transform(normalizePersonName)
    .pipe(z.string().min(2, 'Soyad en az 2 karakter olmalı').max(100)),
  birthDate: z
    .string()
    .min(1, 'Doğum tarihi zorunludur')
    .refine(
      (v) => !Number.isNaN(Date.parse(v)) && new Date(v) <= new Date(),
      'Geçerli bir doğum tarihi girin',
    ),
  gender: z.enum(['MALE', 'FEMALE']).or(z.literal('')),
  motherName: optionalText(100),
  fatherName: optionalText(100),
  phone: z
    .string()
    .refine((v) => isValidGsm(v), 'GSM 10 haneli olmalı ve 5 ile başlamalı (5XX XXX XX XX)'),
  homePhone: z
    .string()
    .refine(
      (v) => v.replace(/\D/g, '') === '' || isValidLandline(v),
      'Ev telefonu 10 haneli olmalı (2XX/3XX/4XX ile başlar)',
    ),
  email: z.email('Geçerli bir e-posta adresi girin').or(z.literal('')),
  addressProvinceId: z.number().int().nullable(),
  addressDistrictId: z.number().int().nullable(),
  addressNeighborhoodId: z.number().int().nullable(),
  addressLine: optionalText(500),
  notes: optionalText(2000),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED']),
});

export type PatientFormValues = z.input<typeof patientSchema>;
export type PatientFormOutput = z.output<typeof patientSchema>;

export const emptyPatientForm: PatientFormValues = {
  companyId: '',
  nationalId: '',
  registrationNumber: '',
  passportNumber: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: '',
  motherName: '',
  fatherName: '',
  phone: '',
  homePhone: '',
  email: '',
  addressProvinceId: null,
  addressDistrictId: null,
  addressNeighborhoodId: null,
  addressLine: '',
  notes: '',
  status: 'ACTIVE',
};

const blank = (value: string | undefined) =>
  value && value.trim() !== '' ? value.trim() : undefined;

/** Maps validated form values to the API payload (empty strings become undefined, phones are digits only). */
export function toPatientInput(values: PatientFormOutput): PatientInput {
  return {
    companyId: blank(values.companyId),
    nationalId: values.nationalId.trim(),
    registrationNumber: blank(values.registrationNumber),
    passportNumber: blank(values.passportNumber)?.toUpperCase(),
    firstName: values.firstName,
    lastName: values.lastName,
    birthDate: values.birthDate,
    gender: values.gender === '' ? undefined : values.gender,
    motherName: blank(values.motherName),
    fatherName: blank(values.fatherName),
    phone: normalizeGsm(values.phone),
    homePhone: blank(normalizeGsm(values.homePhone)),
    email: blank(values.email),
    addressProvinceId: values.addressProvinceId,
    addressDistrictId: values.addressDistrictId,
    addressNeighborhoodId: values.addressNeighborhoodId,
    addressLine: blank(values.addressLine),
    notes: blank(values.notes),
    status: values.status,
  };
}
