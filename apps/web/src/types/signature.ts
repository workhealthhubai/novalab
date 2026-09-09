import type { ConsentStatus, ConsentType, DocumentCategory } from '@osgb/shared-types';

export interface DocumentSignature {
  id: string;
  documentId: string;
  employeeId: string;
  consentId: string | null;
  title: string;
  signerName: string;
  signedAt: string;
  sha256: string;
  createdAt: string;
  document: { id: string; fileName: string; sizeBytes: number; category: DocumentCategory };
  employee: { id: string; firstName: string; lastName: string; nationalId: string | null };
  consent: {
    id: string;
    status: ConsentStatus;
    template: { type: ConsentType; version: number };
  } | null;
  collectedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface ConsentFormText {
  id: string;
  type: ConsentType;
  version: number;
  isActive: boolean;
  title: string;
  body: string;
  organizationName: string;
}

export interface SignatureListQuery {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  search?: string;
}

export interface SignConsentInput {
  employeeId: string;
  templateId: string;
  signerName?: string;
  /** PNG data URL from the pad. */
  signature: string;
}

export interface SignUploadInput {
  file: File;
  employeeId: string;
  title: string;
  signerName?: string;
  signature: string;
}

export interface SignatureVerification {
  id: string;
  valid: boolean;
  expected: string;
  current: string;
  signedAt: string;
}
