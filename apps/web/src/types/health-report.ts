import type {
  Anamnesis,
  ExaminationStatus,
  ExaminationType,
  FitnessDecision,
  Gender,
  ProtocolItemStatus,
  ProtocolItemType,
  ProtocolStatus,
  SystemsExam,
} from '@osgb/shared-types';
import type { MeasurementValue } from './examination';

export interface HealthReport {
  id: string;
  employeeId: string;
  protocolId: string | null;
  type: ExaminationType;
  status: ExaminationStatus;
  scheduledAt: string | null;
  performedAt: string | null;
  physicianId: string | null;
  physicianProfileId: string | null;
  findings: string | null;
  conclusion: string | null;
  fitnessDecision: FitnessDecision;
  restrictions: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  nextExaminationDue: string | null;
  reportDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
  anamnesis: Anamnesis;
  systemsExam: SystemsExam;
  measurements: Record<string, MeasurementValue>;
  blockers: string[];
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    nationalId: string | null;
    birthDate: string | null;
    gender: Gender | null;
    hireDate: string | null;
    company: { id: string; name: string } | null;
    occupation: { id: string; name: string } | null;
  };
  protocol: {
    id: string;
    protocolNumber: string;
    type: ExaminationType;
    status: ProtocolStatus;
    items: Array<{ id: string; type: ProtocolItemType; status: ProtocolItemStatus }>;
  } | null;
  physicianProfile: {
    id: string;
    title: string | null;
    firstName: string;
    lastName: string;
    specialty: string | null;
    diplomaNumber: string | null;
    signatureUpdatedAt: string | null;
  } | null;
  approvedBy: { id: string; firstName: string; lastName: string } | null;
  reportDocument: { id: string; fileName: string; sizeBytes: number; createdAt: string } | null;
}

export interface TestSummary {
  module: 'audiometry' | 'spirometry' | 'eye' | 'ecg' | 'radiology' | 'pneumoconiosis';
  id: string;
  performedAt: string;
  title: string;
  lines: string[];
  alert: boolean;
}

export type HealthReportDetail = HealthReport & { tests: TestSummary[] };

export interface HealthReportListQuery {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  status?: ExaminationStatus;
  fitnessDecision?: FitnessDecision;
  search?: string;
  from?: string;
  to?: string;
}

export interface HealthReportUpdateInput {
  performedAt?: string;
  physicianProfileId?: string | null;
  anamnesis?: Anamnesis;
  systemsExam?: SystemsExam;
  findings?: string | null;
  conclusion?: string | null;
  fitnessDecision?: FitnessDecision;
  restrictions?: string | null;
  nextExaminationDue?: string | null;
}

/** Latest record per doctor module for a patient (GET /health-reports/patients/:id/summary). */
export interface PatientMedicalSummary {
  audiometry: {
    count: number;
    id?: string;
    performedAt?: string;
    ptaRight?: number | null;
    ptaLeft?: number | null;
  };
  spirometry: { count: number; id?: string; performedAt?: string; pattern?: string | null };
  eye: { count: number; id?: string; performedAt?: string; recommendation?: string };
  ecg: { count: number; id?: string; performedAt?: string; interpretation?: string };
  pneumoconiosis: {
    count: number;
    id?: string;
    readAt?: string;
    result?: string;
    profusion?: string | null;
  };
  radiology: {
    count: number;
    id?: string;
    requestedAt?: string;
    modality?: string;
    bodyPart?: string | null;
    status?: string;
  };
  report: {
    count: number;
    id?: string;
    performedAt?: string | null;
    status?: ExaminationStatus;
    fitnessDecision?: FitnessDecision;
    nextExaminationDue?: string | null;
    reportDocumentId?: string | null;
    protocol?: { id: string; protocolNumber: string } | null;
  };
}
