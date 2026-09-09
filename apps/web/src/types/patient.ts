import type { EmployeeStatus, Gender, IdentityVerificationStatus } from '@osgb/shared-types';

export interface NamedRef {
  id: string;
  name: string;
}

export interface LocationRef {
  id: number;
  name: string;
}

/** A patient (OSGB employee record) as returned by GET /employees/:id. */
export interface Patient {
  id: string;
  companyId: string | null;
  branchId: string | null;
  workplaceId: string | null;
  nationalId: string | null;
  registrationNumber: string | null;
  passportNumber: string | null;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: Gender | null;
  motherName: string | null;
  fatherName: string | null;
  phone: string | null;
  homePhone: string | null;
  email: string | null;
  addressProvinceId: number | null;
  addressDistrictId: number | null;
  addressNeighborhoodId: number | null;
  addressLine: string | null;
  notes: string | null;
  occupationId: string | null;
  jobTitle: string | null;
  department: string | null;
  hireDate: string | null;
  status: EmployeeStatus;
  identityVerificationStatus: IdentityVerificationStatus;
  identityVerifiedAt: string | null;
  identityVerificationSource: string | null;
  /** Set when a portrait is stored; changes whenever the photo is replaced (cache key). */
  photoUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company?: NamedRef;
  branch?: NamedRef | null;
  workplace?: NamedRef | null;
  occupation?: { id: string; name: string; code: string | null } | null;
  addressProvince?: LocationRef | null;
  addressDistrict?: LocationRef | null;
  addressNeighborhood?: LocationRef | null;
}

export type PatientListItem = Pick<
  Patient,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'nationalId'
  | 'registrationNumber'
  | 'phone'
  | 'birthDate'
  | 'status'
  | 'identityVerificationStatus'
  | 'company'
> & {
  /** Present on list rows that include it; used for sex-specific reference ranges. */
  gender?: Gender | null;
};

/** Payload accepted by POST/PATCH /employees. */
export interface PatientInput {
  companyId?: string;
  nationalId?: string;
  registrationNumber?: string;
  passportNumber?: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender?: Gender;
  motherName?: string;
  fatherName?: string;
  phone: string;
  homePhone?: string;
  email?: string;
  addressProvinceId?: number | null;
  addressDistrictId?: number | null;
  addressNeighborhoodId?: number | null;
  addressLine?: string;
  notes?: string;
  occupationId?: string | null;
  status?: EmployeeStatus;
}

export interface PatientListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  companyId?: string;
  status?: EmployeeStatus;
  identityVerificationStatus?: IdentityVerificationStatus;
}
