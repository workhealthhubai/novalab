import type { ConsentMethod, ConsentStatus, ConsentType } from '@osgb/shared-types';

export interface ConsentTemplate {
  id: string;
  type: ConsentType;
  version: number;
  title: string;
  body: string;
  effectiveFrom: string;
  isActive: boolean;
  createdAt: string;
  _count: { consents: number };
}

export interface PatientConsent {
  id: string;
  employeeId: string;
  templateId: string;
  status: ConsentStatus;
  method: ConsentMethod;
  givenAt: string;
  withdrawnAt: string | null;
  withdrawReason: string | null;
  note: string | null;
  documentId: string | null;
  template: { id: string; type: ConsentType; version: number; title: string };
  employee: { id: string; firstName: string; lastName: string; nationalId: string | null };
  collectedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface ConsentSummaryItem {
  type: ConsentType;
  activeTemplate: { id: string; type: ConsentType; version: number; title: string };
  latest: PatientConsent | null;
  state: 'CURRENT' | 'OUTDATED' | 'MISSING';
}

export interface PublishTemplateInput {
  type: ConsentType;
  title: string;
  body: string;
  effectiveFrom?: string;
}

export interface GiveConsentInput {
  employeeId: string;
  templateId?: string;
  type?: ConsentType;
  method: ConsentMethod;
  givenAt?: string;
  note?: string | null;
}

export interface ConsentListQuery {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  type?: ConsentType;
  status?: ConsentStatus;
  search?: string;
}
