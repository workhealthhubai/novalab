import { PATHS } from '@/app/router/navigation';
import type { Status } from '@/design-system/status-badge';
import type { ActivityCategory, ActivityEntry } from '@/types/audit';
import { ENTITY_LABELS } from './audit-labels';

export const CATEGORY_LABELS: Record<ActivityCategory, { label: string; status: Status }> = {
  SESSION: { label: 'Oturum', status: 'waiting' },
  PATIENT: { label: 'Hasta kayıt', status: 'completed' },
  PROTOCOL: { label: 'Protokol', status: 'completed' },
  TEST: { label: 'Tetkik', status: 'signed' },
  REPORT: { label: 'Rapor', status: 'signed' },
  DOCUMENT: { label: 'Belge', status: 'waiting' },
  DEFINITION: { label: 'Tanımlar', status: 'waiting' },
  ACCESS: { label: 'Tıbbi veri erişimi', status: 'waiting' },
  FAILURE: { label: 'Başarısız', status: 'cancelled' },
  OTHER: { label: 'Diğer', status: 'waiting' },
};
export const CATEGORY_FILTERS: ActivityCategory[] = [
  'PATIENT',
  'PROTOCOL',
  'TEST',
  'REPORT',
  'DOCUMENT',
  'DEFINITION',
  'ACCESS',
  'SESSION',
  'FAILURE',
];

const TEST_NAMES: Record<string, string> = {
  AudiometryTest: 'odyometri testi',
  SpirometryTest: 'spirometri testi',
  EyeExamination: 'göz muayenesi',
  EcgRecord: 'EKG kaydı',
  PneumoconiosisReading: 'ILO okuması',
  RadiologyRequest: 'radyoloji isteği',
};

const VERBS: Record<string, string> = {
  CREATE: 'oluşturdu',
  UPDATE: 'güncelledi',
  DELETE: 'sildi',
  EXPORT: 'indirdi',
  MEDICAL_DATA_ACCESS: 'görüntüledi',
};

function meta(entry: ActivityEntry): Record<string, unknown> {
  return entry.newValue && typeof entry.newValue === 'object'
    ? (entry.newValue as Record<string, unknown>)
    : {};
}

/** Human sentence for one row, e.g. "Ayşe Yılmaz hastasını kaydetti", "2026-000004 protokolünü kapattı". */
export function describeActivity(entry: ActivityEntry): string {
  const label = entry.entityLabel;
  const m = meta(entry);
  switch (entry.action) {
    case 'LOGIN':
      return 'giriş yaptı';
    case 'LOGOUT':
      return 'çıkış yaptı';
    case 'LOGIN_FAILED':
      return `başarısız giriş denemesi${typeof m.email === 'string' ? ` (${m.email})` : ''}`;
    case 'TOKEN_REUSE_DETECTED':
      return 'oturum ihlali algılandı (tüm oturumlar kapatıldı)';
    default:
      break;
  }
  const type = entry.entityType;
  if (entry.action === 'MEDICAL_DATA_ACCESS') {
    const what = TEST_NAMES[type]
      ? `${TEST_NAMES[type]} kayıtlarını`
      : type === 'Examination'
        ? 'muayene / rapor kayıtlarını'
        : `${ENTITY_LABELS[type] ?? type} kayıtlarını`;
    return `${label ? `${label} · ` : ''}${what} görüntüledi`;
  }
  const verb = VERBS[entry.action] ?? entry.action;
  if (type === 'Employee')
    return `${label ?? 'bir hastayı'} hastasını ${entry.action === 'CREATE' ? 'kaydetti' : verb}`;
  if (type === 'EmployeeImport')
    return `toplu hasta aktarımı yaptı${typeof m.imported === 'number' ? ` (${m.imported} kayıt)` : ''}`;
  if (type === 'CompanyImport')
    return `toplu firma aktarımı yaptı${typeof m.imported === 'number' ? ` (${m.imported} kayıt)` : ''}`;
  if (type === 'Protocol') {
    const status = typeof m.status === 'string' ? m.status : null;
    const changed = Array.isArray(m.changedFields) ? (m.changedFields as string[]) : [];
    const item = changed.find((c) => c.startsWith('item:'));
    if (entry.action === 'CREATE') return `${label ?? 'protokol'} protokolünü açtı`;
    if (status === 'COMPLETED') return `${label ?? 'protokol'} protokolünü kapattı`;
    if (status === 'CANCELLED') return `${label ?? 'protokol'} protokolünü iptal etti`;
    if (item) return `${label ?? 'protokol'} protokolünde ${item.slice(5)} kalemini güncelledi`;
    return `${label ?? 'protokol'} protokolünü güncelledi`;
  }
  if (type === 'Examination') {
    if (m.status === 'APPROVED')
      return `${label ?? 'hasta'} sağlık raporunu onayladı${typeof m.reportNo === 'string' ? ` (${m.reportNo})` : ''}`;
    if (Array.isArray(m.measurementKeys)) return `${label ?? 'hasta'} muayene ölçümlerini girdi`;
    if (m.source === 'health-report') return `${label ?? 'hasta'} için sağlık raporu açtı`;
    return `${label ?? 'hasta'} muayenesini ${verb}`;
  }
  if (TEST_NAMES[type]) return `${label ? `${label} · ` : ''}${TEST_NAMES[type]} ${verb}`;
  if (type === 'PatientConsent')
    return `${label ? `${label} · ` : ''}KVKK rızası ${m.status === 'WITHDRAWN' ? 'geri çekti' : 'kaydetti'}`;
  if (type === 'DocumentSignature') return `${label ? `${label} · ` : ''}belge imzalattı`;
  if (type === 'Document')
    return `${label ? `"${label}" ` : ''}belgesini ${entry.action === 'EXPORT' ? 'indirdi' : verb}`;
  if (type === 'User') return `${label ?? 'kullanıcı'} kullanıcısını ${verb}`;
  if (type === 'Role') return `${label ?? 'rol'} rolünü ${verb}`;
  if (type === 'Session')
    return entry.action === 'DELETE' ? 'bir oturumu sonlandırdı' : `oturum ${verb}`;
  const noun = ENTITY_LABELS[type] ?? type;
  return `${label ? `${label} ` : ''}${noun.toLocaleLowerCase('tr-TR')} kaydını ${verb}`;
}

/** Where the row's entity lives in the app, when we have a page for it. */
export function activityPath(entry: ActivityEntry): string | null {
  const id = entry.entityId;
  if (!id) return null;
  switch (entry.entityType) {
    case 'Employee':
      return PATHS.patientDetail.replace(':patientId', id);
    case 'Protocol':
      return PATHS.protocolDetail.replace(':protocolId', id);
    case 'Examination':
      return PATHS.healthReport.replace(':examinationId', id);
    case 'AudiometryTest':
      return PATHS.audiometryTest.replace(':testId', id);
    case 'SpirometryTest':
      return PATHS.spirometryTest.replace(':testId', id);
    case 'EyeExamination':
      return PATHS.eyeExamination.replace(':examId', id);
    case 'EcgRecord':
      return PATHS.ecgRecord.replace(':recordId', id);
    case 'PneumoconiosisReading':
      return PATHS.pneumoconiosisReading.replace(':readingId', id);
    case 'RadiologyRequest':
      return PATHS.radiologyStudy.replace(':requestId', id);
    case 'Company':
      return PATHS.companyDetail.replace(':companyId', id);
    case 'PatientConsent':
    case 'DocumentSignature':
    case 'Document':
      return entry.patientId ? PATHS.patientDetail.replace(':patientId', entry.patientId) : null;
    default:
      return null;
  }
}
