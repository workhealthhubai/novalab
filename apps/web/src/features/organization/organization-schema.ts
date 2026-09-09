import { z } from 'zod';
import type { Organization, OrganizationInput } from '@/types/organization';

const text = (max: number) => z.string().trim().max(max, `En fazla ${max} karakter`);

export const organizationSchema = z.object({
  name: z.string().trim().min(2, 'Kurum adı en az 2 karakter olmalı').max(200),
  legalName: text(300),
  taxOffice: text(100),
  taxNumber: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{10,11}$/.test(v), 'Vergi no 10 haneli (şahıs için 11) olmalı'),
  sgkRegistrationNumber: text(50),
  authorizationNumber: text(50),
  authorizationDate: z
    .string()
    .refine((v) => v === '' || !Number.isNaN(Date.parse(v)), 'Geçerli bir tarih girin'),
  responsibleManager: text(150),
  phone: text(30),
  fax: text(30),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Geçerli bir e-posta girin'),
  website: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v),
      'Geçerli bir web adresi girin',
    ),
  addressProvinceId: z.number().nullable(),
  addressDistrictId: z.number().nullable(),
  addressLine: text(500),
  reportFooter: text(1000),
});
export type OrganizationFormValues = z.infer<typeof organizationSchema>;

export function toFormValues(org: Organization): OrganizationFormValues {
  const p = org.profile;
  return {
    name: org.name,
    legalName: p.legalName ?? '',
    taxOffice: p.taxOffice ?? '',
    taxNumber: p.taxNumber ?? '',
    sgkRegistrationNumber: p.sgkRegistrationNumber ?? '',
    authorizationNumber: p.authorizationNumber ?? '',
    authorizationDate: p.authorizationDate ? p.authorizationDate.slice(0, 10) : '',
    responsibleManager: p.responsibleManager ?? '',
    phone: p.phone ?? '',
    fax: p.fax ?? '',
    email: p.email ?? '',
    website: p.website ?? '',
    addressProvinceId: p.addressProvinceId,
    addressDistrictId: p.addressDistrictId,
    addressLine: p.addressLine ?? '',
    reportFooter: p.reportFooter ?? '',
  };
}

/** Every field is sent; the API treats '' as "clear". */
export function toOrganizationInput(values: OrganizationFormValues): OrganizationInput {
  return { ...values };
}
