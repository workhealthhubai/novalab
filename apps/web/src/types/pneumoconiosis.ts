import type {
  ExaminationType,
  PneumoconiosisAnalysis,
  PneumoconiosisFlag,
  PneumoconiosisResult,
  ProtocolStatus,
  RadiologyModality,
  RadiologyRequestStatus,
} from '@osgb/shared-types';

export interface PneumoconiosisReading {
  id: string;
  employeeId: string;
  protocolId: string | null;
  radiologyRequestId: string | null;
  readAt: string;
  readerId: string | null;
  readerRole: string | null;
  filmDate: string | null;
  filmQuality: number | null;
  qualityComment: string | null;
  profusion: string | null;
  shapePrimary: string | null;
  shapeSecondary: string | null;
  zones: string[];
  largeOpacity: string;
  pleuralPlaques: boolean;
  plaqueCalcification: boolean;
  diffuseThickening: boolean;
  costophrenicObliteration: string[];
  symbols: string[];
  result: PneumoconiosisResult;
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
  radiologyRequest: {
    id: string;
    modality: RadiologyModality;
    bodyPart: string | null;
    requestedAt: string;
    studyInstanceUid: string | null;
    status: RadiologyRequestStatus;
  } | null;
  reader: { id: string; firstName: string; lastName: string } | null;
  analysis: PneumoconiosisAnalysis;
}

export type PneumoconiosisReadingDetail = PneumoconiosisReading & {
  previous: {
    id: string;
    readAt: string;
    filmDate: string | null;
    profusion: string | null;
  } | null;
};

export interface PneumoconiosisHistoryPoint {
  id: string;
  readAt: string;
  filmDate: string | null;
  profusion: string | null;
  category: number | null;
  largeOpacity: string;
  result: PneumoconiosisResult;
  readerRole: string | null;
  reader: { id: string; firstName: string; lastName: string } | null;
  flags: PneumoconiosisFlag[];
  protocol: { id: string; protocolNumber: string } | null;
}

export interface PneumoconiosisListQuery {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  result?: PneumoconiosisResult;
  search?: string;
  from?: string;
  to?: string;
}

export interface PneumoconiosisInput {
  employeeId: string;
  protocolId?: string | null;
  radiologyRequestId?: string | null;
  readAt?: string;
  readerRole?: string | null;
  filmDate?: string | null;
  filmQuality?: number | null;
  qualityComment?: string | null;
  profusion?: string | null;
  shapePrimary?: string | null;
  shapeSecondary?: string | null;
  zones?: string[];
  largeOpacity?: string;
  pleuralPlaques?: boolean;
  plaqueCalcification?: boolean;
  diffuseThickening?: boolean;
  costophrenicObliteration?: string[];
  symbols?: string[];
  result?: PneumoconiosisResult;
  comment?: string | null;
}

export type PneumoconiosisUpdateInput = Partial<Omit<PneumoconiosisInput, 'employeeId'>>;
