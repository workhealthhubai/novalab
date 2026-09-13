import type {
  ExaminationType,
  ProtocolItemStatus,
  ProtocolItemType,
  ProtocolStatus,
} from '@osgb/shared-types';
import type {
  ExaminationStatus,
  RadiologyModality,
  RadiologyRequestStatus,
} from '@osgb/shared-types';
import type { NamedRef } from './patient';

export interface ProtocolPatientRef {
  id: string;
  firstName: string;
  lastName: string;
  nationalId: string | null;
  registrationNumber: string | null;
  birthDate: string | null;
  phone: string | null;
}

export interface ProtocolExaminationSummary {
  id: string;
  status: ExaminationStatus;
  approvedAt: string | null;
}

export interface ProtocolWorklistItem {
  id: string;
  protocolNumber: string;
  type: ExaminationType;
  openedAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    nationalId: string | null;
    birthDate: string | null;
    gender: 'MALE' | 'FEMALE' | null;
  };
  company: NamedRef | null;
  pendingCount: number;
}

/** Doctor-module records linked to a protocol (GET /protocols/:id/records). */
export interface ProtocolRecords {
  operations?: Array<{
    id: string;
    kind: string;
    date: string;
    status: string;
    protocolId: string | null;
  }>;
  audiometry: Array<{
    id: string;
    performedAt: string;
  }>;
  spirometry: Array<{
    id: string;
    performedAt: string;
  }>;
  eye: Array<{ id: string; performedAt: string }>;
  ecg: Array<{ id: string; performedAt: string }>;
  pneumoconiosis: Array<{
    id: string;
    readAt: string;
    radiologyRequestId: string | null;
  }>;
  radiology: Array<{
    id: string;
    modality: RadiologyModality;
    bodyPart: string | null;
    status: RadiologyRequestStatus;
    requestedAt: string;
  }>;
  healthReport: {
    id: string;
    status: ExaminationStatus;
    performedAt: string | null;
    approvedAt: string | null;
  } | null;
}

export interface ProtocolItem {
  id: string;
  type: ProtocolItemType;
  status: ProtocolItemStatus;
  note: string | null;
  completedAt: string | null;
  orderIndex: number;
}

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Protocol {
  id: string;
  protocolNumber: string;
  employeeId: string;
  companyId: string | null;
  type: ExaminationType;
  status: ProtocolStatus;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  employee: ProtocolPatientRef;
  company: NamedRef | null;
  openedBy: UserRef;
  closedBy: UserRef | null;
  items: ProtocolItem[];
  /** The protocol's health report (examination), newest first (0 or 1 entries). */
  examinations: ProtocolExaminationSummary[];
}

export type ProtocolListItem = Omit<Protocol, 'openedBy' | 'closedBy' | 'items'> & {
  items: Array<Pick<ProtocolItem, 'id' | 'type' | 'status'>>;
};

export interface CreateProtocolInput {
  employeeId: string;
  type: ExaminationType;
  companyId?: string;
  items: ProtocolItemType[];
  notes?: string;
}

export interface UpdateProtocolInput {
  type?: ExaminationType;
  companyId?: string | null;
  notes?: string | null;
}

export interface ProtocolListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ProtocolStatus;
  employeeId?: string;
  companyId?: string;
  from?: string;
  to?: string;
}
