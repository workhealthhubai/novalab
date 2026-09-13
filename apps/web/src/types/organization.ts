import type { TenantStatus } from '@osgb/shared-types';
import type { LocationRef } from './patient';

export interface OrganizationProfile {
  id: string;
  legalName: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  sgkRegistrationNumber: string | null;
  authorizationNumber: string | null;
  authorizationDate: string | null;
  responsibleManager: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  addressProvinceId: number | null;
  addressDistrictId: number | null;
  addressLine: string | null;
  reportFooter: string | null;
  radiologyStationAet: string | null;
  logoUpdatedAt: string | null;
  addressProvince: LocationRef | null;
  addressDistrict: LocationRef | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  profile: OrganizationProfile;
}

/** PUT payload; empty strings clear a field. */
export type OrganizationInput = Partial<{
  name: string;
  legalName: string;
  taxOffice: string;
  taxNumber: string;
  sgkRegistrationNumber: string;
  authorizationNumber: string;
  authorizationDate: string;
  responsibleManager: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  addressProvinceId: number | null;
  addressDistrictId: number | null;
  addressLine: string;
  reportFooter: string;
  radiologyStationAet: string;
}>;
