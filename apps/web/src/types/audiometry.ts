import type { EarAnalysis, ExaminationType, ProtocolStatus, Thresholds } from '@osgb/shared-types';

export interface AudiometryPatientRef {
  id: string;
  firstName: string;
  lastName: string;
  nationalId: string | null;
  birthDate: string | null;
}

export interface AudiometryTest {
  id: string;
  employeeId: string;
  protocolId: string | null;
  performedAt: string;
  performedById: string | null;
  deviceName: string | null;
  isBaseline: boolean;
  quietHours: number | null;
  airRight: Thresholds;
  airLeft: Thresholds;
  boneRight: Thresholds | null;
  boneLeft: Thresholds | null;
  ptaRight: number | null;
  ptaLeft: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  employee: AudiometryPatientRef;
  protocol: {
    id: string;
    protocolNumber: string;
    type: ExaminationType;
    status: ProtocolStatus;
  } | null;
  performedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface EarShift {
  shiftDb: number | null;
  sts: boolean;
}

export interface ShiftComparison {
  testId: string;
  performedAt: string;
  right: EarShift;
  left: EarShift;
}

export type AnalysisFlag = 'STS_BASELINE' | 'STS_PREVIOUS' | 'NOISE_NOTCH' | 'ASYMMETRY';

export interface TestAnalysis {
  right: EarAnalysis;
  left: EarAnalysis;
  vsBaseline: ShiftComparison | null;
  vsPrevious: ShiftComparison | null;
  flags: AnalysisFlag[];
}

export type AudiometryTestDetail = AudiometryTest & { analysis: TestAnalysis };

export interface AudiometryHistoryPoint {
  id: string;
  performedAt: string;
  isBaseline: boolean;
  ptaRight: number | null;
  ptaLeft: number | null;
  protocol: { id: string; protocolNumber: string } | null;
}

export interface AudiometryListQuery {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface AudiometryInput {
  employeeId: string;
  protocolId?: string | null;
  performedAt?: string;
  deviceName?: string | null;
  isBaseline?: boolean;
  quietHours?: number | null;
  airRight: Thresholds;
  airLeft: Thresholds;
  boneRight?: Thresholds | null;
  boneLeft?: Thresholds | null;
  notes?: string | null;
}

export type AudiometryUpdateInput = Partial<Omit<AudiometryInput, 'employeeId'>>;
