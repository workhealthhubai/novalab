import type {
  ColorVisionResult,
  ExaminationType,
  EyeAnalysis,
  EyeFlag,
  EyeRecommendation,
  ProtocolStatus,
  VisualFieldResult,
} from '@osgb/shared-types';

export interface EyeExamination {
  id: string;
  employeeId: string;
  protocolId: string | null;
  performedAt: string;
  performedById: string | null;
  usesGlasses: boolean;
  usesContactLenses: boolean;
  farRight: number | null;
  farLeft: number | null;
  farRightCorrected: number | null;
  farLeftCorrected: number | null;
  nearRight: number | null;
  nearLeft: number | null;
  ishiharaCorrect: number | null;
  ishiharaTotal: number | null;
  colorVision: ColorVisionResult;
  visualField: VisualFieldResult;
  findings: string | null;
  recommendation: EyeRecommendation;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    nationalId: string | null;
    birthDate: string | null;
  };
  protocol: {
    id: string;
    protocolNumber: string;
    type: ExaminationType;
    status: ProtocolStatus;
  } | null;
  performedBy: { id: string; firstName: string; lastName: string } | null;
  analysis: EyeAnalysis;
}

export interface EyeHistoryPoint {
  id: string;
  performedAt: string;
  bestRight: number | null;
  bestLeft: number | null;
  colorVision: ColorVisionResult;
  recommendation: EyeRecommendation;
  flags: EyeFlag[];
  protocol: { id: string; protocolNumber: string } | null;
}

export interface EyeListQuery {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  recommendation?: EyeRecommendation;
  search?: string;
  from?: string;
  to?: string;
}

export interface EyeInput {
  employeeId: string;
  protocolId?: string | null;
  performedAt?: string;
  usesGlasses?: boolean;
  usesContactLenses?: boolean;
  farRight?: number | null;
  farLeft?: number | null;
  farRightCorrected?: number | null;
  farLeftCorrected?: number | null;
  nearRight?: number | null;
  nearLeft?: number | null;
  ishiharaCorrect?: number | null;
  ishiharaTotal?: number | null;
  colorVision?: ColorVisionResult;
  visualField?: VisualFieldResult;
  findings?: string | null;
  recommendation?: EyeRecommendation;
  comment?: string | null;
}

export type EyeUpdateInput = Partial<Omit<EyeInput, 'employeeId'>>;
