import type { HazardClass } from '@osgb/shared-types';
import type { NamedRef } from './patient';

export interface Company {
  id: string;
  name: string;
  taxNumber: string | null;
  sgkRegistrationNumber: string | null;
  hazardClass: HazardClass;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyListItem extends Company {
  _count: { employees: number; branches: number };
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  address: string | null;
  phone: string | null;
  company?: NamedRef;
}

export interface Workplace {
  id: string;
  companyId: string;
  branchId: string | null;
  name: string;
  sgkRegistrationNumber: string | null;
  hazardClass: HazardClass;
  naceCode: string | null;
  address: string | null;
  employeeCount: number | null;
  company?: NamedRef;
  branch?: NamedRef | null;
}

export interface CompanyDetail extends Company {
  branches: Branch[];
  workplaces: Workplace[];
}

export interface CompanyInput {
  name: string;
  taxNumber?: string;
  sgkRegistrationNumber?: string;
  hazardClass?: HazardClass;
  address?: string;
  phone?: string;
  email?: string;
}

export interface BranchInput {
  companyId: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface WorkplaceInput {
  companyId: string;
  branchId?: string;
  name: string;
  sgkRegistrationNumber?: string;
  hazardClass?: HazardClass;
  naceCode?: string;
  address?: string;
  employeeCount?: number;
}
