import type { RadiologyModality, RadiologyRequestStatus } from '@osgb/shared-types';

export interface RadiologyPatientRef {
  id: string;
  firstName: string;
  lastName: string;
  nationalId?: string | null;
}

export interface RadiologyRequestListItem {
  id: string;
  employeeId: string;
  examinationId: string | null;
  modality: RadiologyModality;
  status: RadiologyRequestStatus;
  bodyPart: string | null;
  clinicalInfo: string | null;
  orthancStudyId: string | null;
  studyInstanceUid: string | null;
  requestedAt: string;
  completedAt: string | null;
  reportedById: string | null;
  reportedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee: RadiologyPatientRef;
}

export interface RadiologyRequest extends RadiologyRequestListItem {
  /** Medical data; only on the detail endpoint. */
  reportText: string | null;
  viewerUrl: string | null;
  previewUrl: string | null;
}

export interface StudySummary {
  orthancStudyId: string;
  studyInstanceUid: string;
  studyDate: string | null;
  studyTime: string | null;
  description: string | null;
  accessionNumber: string | null;
  modalities: string[];
  seriesCount: number;
  instanceCount: number;
  patientId: string | null;
  patientName: string | null;
  patientBirthDate: string | null;
  isStable: boolean;
}

export interface RadiologyListQuery {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  status?: RadiologyRequestStatus;
  modality?: RadiologyModality;
  search?: string;
  from?: string;
  to?: string;
}

export interface CreateRadiologyRequestInput {
  employeeId: string;
  modality: RadiologyModality;
  bodyPart?: string;
  clinicalInfo?: string;
  examinationId?: string;
}

export interface ViewerSession {
  viewerUrl: string;
  previewUrl: string;
  expiresIn: number;
}
