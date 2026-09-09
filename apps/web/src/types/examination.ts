import type {
  ExaminationStatus,
  ExaminationType,
  FitnessDecision,
  ProtocolItemStatus,
  ProtocolItemType,
} from '@osgb/shared-types';

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface MeasurementValue {
  value: number;
  note: string | null;
  recordedAt: string;
}

export interface TimelineExamination {
  id: string;
  type: ExaminationType;
  status: ExaminationStatus;
  scheduledAt: string | null;
  performedAt: string | null;
  createdAt: string;
  /** performedAt ?? scheduledAt ?? createdAt */
  date: string;
  fitnessDecision: FitnessDecision;
  nextExaminationDue: string | null;
  protocol: { id: string; protocolNumber: string } | null;
  physician: UserRef | null;
  _count: { measurements: number };
}

export interface ComparedExamination {
  id: string;
  type: ExaminationType;
  status: ExaminationStatus;
  scheduledAt: string | null;
  performedAt: string | null;
  createdAt: string;
  date: string;
  fitnessDecision: FitnessDecision;
  restrictions: string | null;
  findings: string | null;
  conclusion: string | null;
  nextExaminationDue: string | null;
  approvedAt: string | null;
  protocol: {
    id: string;
    protocolNumber: string;
    items: Array<{ type: ProtocolItemType; status: ProtocolItemStatus }>;
  } | null;
  physician: UserRef | null;
  approvedBy: UserRef | null;
  measurements: Record<string, MeasurementValue>;
}

export interface ExaminationComparison {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    nationalId: string | null;
    birthDate: string | null;
  };
  /** Oldest first. */
  examinations: ComparedExamination[];
  /** Measurement keys present in at least one column, catalogue order. */
  keys: string[];
}

export interface MeasurementInput {
  key: string;
  value: number;
  note?: string;
}
