import type {
  EcgAnalysis,
  EcgFlag,
  EcgInterpretation,
  EcgRhythm,
  ExaminationType,
  Gender,
  ProtocolStatus,
} from '@osgb/shared-types';

export interface EcgRecord {
  id: string;
  employeeId: string;
  protocolId: string | null;
  performedAt: string;
  performedById: string | null;
  deviceName: string | null;
  heartRate: number | null;
  rhythm: EcgRhythm | null;
  prInterval: number | null;
  qrsDuration: number | null;
  qtInterval: number | null;
  qtcInterval: number | null;
  axis: number | null;
  findings: string[];
  interpretation: EcgInterpretation;
  comment: string | null;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    nationalId: string | null;
    birthDate: string | null;
    gender: Gender | null;
  };
  protocol: {
    id: string;
    protocolNumber: string;
    type: ExaminationType;
    status: ProtocolStatus;
  } | null;
  performedBy: { id: string; firstName: string; lastName: string } | null;
  document: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  } | null;
  analysis: EcgAnalysis;
}

export interface EcgHistoryPoint {
  id: string;
  performedAt: string;
  heartRate: number | null;
  qtc: number | null;
  interpretation: EcgInterpretation;
  protocol: { id: string; protocolNumber: string } | null;
  flags: EcgFlag[];
}

export interface EcgListQuery {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  interpretation?: EcgInterpretation;
  search?: string;
  from?: string;
  to?: string;
}

export interface EcgInput {
  employeeId: string;
  protocolId?: string | null;
  performedAt?: string;
  deviceName?: string | null;
  heartRate?: number | null;
  rhythm?: EcgRhythm | null;
  prInterval?: number | null;
  qrsDuration?: number | null;
  qtInterval?: number | null;
  qtcInterval?: number | null;
  axis?: number | null;
  findings?: string[];
  interpretation?: EcgInterpretation;
  comment?: string | null;
}

export type EcgUpdateInput = Partial<Omit<EcgInput, 'employeeId'>>;
