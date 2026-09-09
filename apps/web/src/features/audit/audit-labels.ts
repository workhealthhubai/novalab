import type { Status } from '@/design-system/status-badge';
import type { AuditEntry } from '@/types/audit';

export const ACTION_LABELS: Record<string, { label: string; status: Status }> = {
  LOGIN: { label: 'Giriş', status: 'completed' },
  LOGOUT: { label: 'Çıkış', status: 'waiting' },
  LOGIN_FAILED: { label: 'Başarısız giriş', status: 'cancelled' },
  TOKEN_REUSE_DETECTED: { label: 'Oturum ihlali', status: 'cancelled' },
  CREATE: { label: 'Oluşturma', status: 'completed' },
  UPDATE: { label: 'Güncelleme', status: 'signed' },
  DELETE: { label: 'Silme', status: 'cancelled' },
  MEDICAL_DATA_ACCESS: { label: 'Tıbbi veri erişimi', status: 'waiting' },
  EXPORT: { label: 'Dışa aktarma', status: 'waiting' },
};

/** Chips shown as quick filters, in display order. */
export const ACTION_FILTERS = [
  'LOGIN',
  'LOGIN_FAILED',
  'CREATE',
  'UPDATE',
  'DELETE',
  'MEDICAL_DATA_ACCESS',
] as const;

export const ENTITY_LABELS: Record<string, string> = {
  Employee: 'Hasta',
  EmployeeImport: 'Toplu hasta aktarma',
  Company: 'Firma',
  CompanyImport: 'Toplu firma aktarma',
  Branch: 'Şube',
  Workplace: 'İşyeri',
  Protocol: 'Protokol',
  Examination: 'Muayene',
  User: 'Kullanıcı',
  UserRole: 'Kullanıcı rolü',
  Role: 'Rol',
  Physician: 'Doktor',
  TestDefinition: 'Tetkik tanımı',
  TestPackage: 'Tetkik paketi',
  Occupation: 'Meslek',
  OrganizationProfile: 'Kurum bilgileri',
  Tenant: 'Kurum',
  Document: 'Belge',
  Session: 'Oturum',
  Auth: 'Oturum',
};

export function entityLabel(type: string): string {
  return ENTITY_LABELS[type] ?? type;
}

/** Business actions map to labels; automatic "METHOD /path" rows are shown as HTTP calls. */
export function describeAction(entry: AuditEntry): {
  label: string;
  status: Status;
  http: boolean;
} {
  const known = ACTION_LABELS[entry.action];
  if (known) return { ...known, http: false };
  const failed = entry.metadata?.outcome === 'FAILURE';
  return { label: entry.action, status: failed ? 'cancelled' : 'waiting', http: true };
}

export function shortId(id: string | null): string {
  return id ? `${id.slice(0, 8)}…` : '—';
}
