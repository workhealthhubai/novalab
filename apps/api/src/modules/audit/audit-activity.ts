import { AuditAction } from '@osgb/shared-types';

/** Coarse grouping of audit rows for the Personel Hareketleri screen. */
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

export const ACTIVITY_CATEGORIES: readonly ActivityCategory[] = [
  'SESSION',
  'PATIENT',
  'PROTOCOL',
  'TEST',
  'REPORT',
  'DOCUMENT',
  'DEFINITION',
  'ACCESS',
  'FAILURE',
  'OTHER',
];

export const CATEGORY_ENTITY_TYPES: Record<
  Exclude<ActivityCategory, 'ACCESS' | 'FAILURE' | 'OTHER' | 'SESSION'>,
  readonly string[]
> = {
  PATIENT: ['Employee', 'Employees', 'EmployeeImport', 'PatientConsent', 'DocumentSignature'],
  PROTOCOL: ['Protocol'],
  TEST: [
    'AudiometryTest',
    'SpirometryTest',
    'EyeExamination',
    'EcgRecord',
    'PneumoconiosisReading',
    'RadiologyRequest',
  ],
  REPORT: ['Examination', 'Report'],
  DOCUMENT: ['Document'],
  DEFINITION: [
    'Company',
    'CompanyImport',
    'Workplace',
    'Branch',
    'Physician',
    'TestDefinition',
    'TestPackage',
    'Occupation',
    'OrganizationProfile',
    'Tenant',
    'ConsentTemplate',
    'User',
    'UserRole',
    'Role',
    'RolePermission',
    'Appointment',
  ],
};

export const SESSION_ACTIONS: readonly string[] = [
  AuditAction.LOGIN,
  AuditAction.LOGOUT,
  AuditAction.LOGIN_FAILED,
  AuditAction.TOKEN_REUSE_DETECTED,
];
/** Business actions; everything else is an automatically captured "METHOD /path" request. */
export const BUSINESS_ACTIONS: readonly string[] = Object.values(AuditAction);

export function categoryOf(row: {
  action: string;
  entityType: string;
  metadata: unknown;
}): ActivityCategory {
  const outcome = (row.metadata as { outcome?: string } | null)?.outcome;
  if (
    outcome === 'FAILURE' ||
    row.action === AuditAction.LOGIN_FAILED ||
    row.action === AuditAction.TOKEN_REUSE_DETECTED
  )
    return 'FAILURE';
  if (
    SESSION_ACTIONS.includes(row.action) ||
    ['Session', 'Auth', 'RefreshSession'].includes(row.entityType)
  )
    return 'SESSION';
  if (row.action === AuditAction.MEDICAL_DATA_ACCESS) return 'ACCESS';
  for (const [category, types] of Object.entries(CATEGORY_ENTITY_TYPES))
    if (types.includes(row.entityType)) return category as ActivityCategory;
  return 'OTHER';
}

/** Which patient a row is about, when the entity itself is not the patient (used for links). */
export function isTechnical(row: { action: string }): boolean {
  return !BUSINESS_ACTIONS.includes(row.action);
}
