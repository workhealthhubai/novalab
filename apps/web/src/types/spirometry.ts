import type {
  ExaminationType,
  Gender,
  ProtocolStatus,
  SmokingStatus,
  SpirometryAnalysis,
  SpirometryPattern,
} from '@osgb/shared-types';

export interface SpirometryTest {
  id: string;
  employeeId: string;
  protocolId: string | null;
  performedAt: string;
  performedById: string | null;
  deviceName: string | null;
  heightCm: number | null;
  weightKg: number | null;
  smokingStatus: SmokingStatus | null;
  fvc: number | null;
  fev1: number | null;
  ratio: number | null;
  pef: number | null;
  fef2575: number | null;
  fvcPredicted: number | null;
  fev1Predicted: number | null;
  postFvc: number | null;
  postFev1: number | null;
  qualityGrade: string | null;
  isBaseline: boolean;
  pattern: SpirometryPattern | null;
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
  analysis: SpirometryAnalysis;
}

export type SpirometryTestDetail = SpirometryTest & {
  baseline: { id: string; performedAt: string; fev1: number | null } | null;
};

export interface SpirometryHistoryPoint {
  id: string;
  performedAt: string;
  isBaseline: boolean;
  fev1: number | null;
  fvc: number | null;
  fev1Percent: number | null;
  fvcPercent: number | null;
  ratio: number | null;
  pattern: SpirometryPattern | null;
  protocol: { id: string; protocolNumber: string } | null;
}

export interface SpirometryListQuery {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  pattern?: SpirometryPattern;
  search?: string;
  from?: string;
  to?: string;
}

export interface SpirometryInput {
  employeeId: string;
  protocolId?: string | null;
  performedAt?: string;
  deviceName?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  smokingStatus?: SmokingStatus | null;
  fvc?: number | null;
  fev1?: number | null;
  ratio?: number | null;
  pef?: number | null;
  fef2575?: number | null;
  fvcPredicted?: number | null;
  fev1Predicted?: number | null;
  postFvc?: number | null;
  postFev1?: number | null;
  qualityGrade?: string | null;
  isBaseline?: boolean;
  pattern?: SpirometryPattern | null;
  comment?: string | null;
}

export type SpirometryUpdateInput = Partial<Omit<SpirometryInput, 'employeeId'>>;
