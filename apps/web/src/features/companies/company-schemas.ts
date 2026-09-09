import { z } from 'zod';
import type { BranchInput, CompanyInput, WorkplaceInput } from '@/types/company';

const optionalText = (max: number) => z.string().trim().max(max, `En fazla ${max} karakter`);
const blank = (value: string) => (value.trim() === '' ? undefined : value.trim());

export const companySchema = z.object({
  name: z.string().trim().min(2, 'Firma adı en az 2 karakter olmalı').max(200),
  taxNumber: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{10,11}$/.test(v), 'Vergi no 10 haneli (TC ile 11) olmalı'),
  sgkRegistrationNumber: optionalText(50),
  hazardClass: z.enum(['LESS_HAZARDOUS', 'HAZARDOUS', 'VERY_HAZARDOUS']),
  address: optionalText(500),
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Geçerli bir e-posta girin'),
});
export type CompanyFormValues = z.infer<typeof companySchema>;

export const emptyCompanyForm: CompanyFormValues = {
  name: '',
  taxNumber: '',
  sgkRegistrationNumber: '',
  hazardClass: 'LESS_HAZARDOUS',
  address: '',
  phone: '',
  email: '',
};

export function toCompanyInput(values: CompanyFormValues): CompanyInput {
  return {
    name: values.name,
    hazardClass: values.hazardClass,
    taxNumber: blank(values.taxNumber),
    sgkRegistrationNumber: blank(values.sgkRegistrationNumber),
    address: blank(values.address),
    phone: blank(values.phone),
    email: blank(values.email),
  };
}

export const branchSchema = z.object({
  name: z.string().trim().min(2, 'Şube adı en az 2 karakter olmalı').max(200),
  address: optionalText(500),
  phone: optionalText(30),
});
export type BranchFormValues = z.infer<typeof branchSchema>;
export const emptyBranchForm: BranchFormValues = { name: '', address: '', phone: '' };

export function toBranchInput(companyId: string, values: BranchFormValues): BranchInput {
  return {
    companyId,
    name: values.name,
    address: blank(values.address),
    phone: blank(values.phone),
  };
}

export const workplaceSchema = z.object({
  name: z.string().trim().min(2, 'İşyeri adı en az 2 karakter olmalı').max(200),
  branchId: z.string(),
  sgkRegistrationNumber: optionalText(50),
  hazardClass: z.enum(['LESS_HAZARDOUS', 'HAZARDOUS', 'VERY_HAZARDOUS']),
  naceCode: optionalText(20),
  address: optionalText(500),
  employeeCount: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d+$/.test(v), 'Sayı girin'),
});
export type WorkplaceFormValues = z.infer<typeof workplaceSchema>;
export const emptyWorkplaceForm: WorkplaceFormValues = {
  name: '',
  branchId: '',
  sgkRegistrationNumber: '',
  hazardClass: 'LESS_HAZARDOUS',
  naceCode: '',
  address: '',
  employeeCount: '',
};

export function toWorkplaceInput(companyId: string, values: WorkplaceFormValues): WorkplaceInput {
  return {
    companyId,
    name: values.name,
    hazardClass: values.hazardClass,
    branchId: blank(values.branchId),
    sgkRegistrationNumber: blank(values.sgkRegistrationNumber),
    naceCode: blank(values.naceCode),
    address: blank(values.address),
    employeeCount: values.employeeCount.trim() === '' ? undefined : Number(values.employeeCount),
  };
}
