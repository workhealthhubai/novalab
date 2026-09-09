export interface AuditUserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AuditMetadata {
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  outcome?: 'SUCCESS' | 'FAILURE';
  errorCode?: string;
  [key: string]: unknown;
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  /** An AuditAction key or "<METHOD> <route>" for automatically captured requests. */
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: AuditMetadata | null;
  createdAt: string;
  user: AuditUserRef | null;
}

export interface AuditQuery {
  page?: number;
  pageSize?: number;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  requestId?: string;
  from?: string;
  to?: string;
  outcome?: 'SUCCESS' | 'FAILURE';
}

export type ActivityCategory =
  | 'SESSION'
  | 'PATIENT'
  | 'PROTOCOL'
  | 'TEST'
  | 'REPORT'
  | 'DOCUMENT'
  | 'DEFINITION'
  | 'ACCESS'
  | 'FAILURE'
  | 'OTHER';

/** Audit row enriched for Personel Hareketleri. */
export interface ActivityEntry extends AuditEntry {
  category: ActivityCategory;
  technical: boolean;
  /** Patient name, protocol number, file name… when the entity could be resolved. */
  entityLabel: string | null;
  patientId: string | null;
}

export interface ActivityQuery extends AuditQuery {
  category?: ActivityCategory;
  technical?: boolean;
}

export interface ActivitySummaryRow {
  userId: string | null;
  user: { id: string; firstName: string; lastName: string; email: string; status: string } | null;
  counts: Record<ActivityCategory, number>;
  total: number;
  lastActivityAt: string;
  lastLoginAt: string | null;
}
