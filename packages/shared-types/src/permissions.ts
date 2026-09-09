/**
 * Canonical permission catalogue.
 *
 * The backend seeds these into the `Permission` table and the `PermissionsGuard`
 * checks them. The frontend uses the same keys for permission-aware UI.
 * Keep this list as the single source of truth.
 */
export const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  ROLES_READ: 'roles.read',
  ROLES_MANAGE: 'roles.manage',

  COMPANIES_READ: 'companies.read',
  COMPANIES_CREATE: 'companies.create',
  COMPANIES_UPDATE: 'companies.update',
  COMPANIES_DELETE: 'companies.delete',

  EMPLOYEES_READ: 'employees.read',
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_UPDATE: 'employees.update',
  EMPLOYEES_DELETE: 'employees.delete',

  WORKPLACES_READ: 'workplaces.read',
  WORKPLACES_MANAGE: 'workplaces.manage',

  EXAMINATIONS_READ: 'examinations.read',
  EXAMINATIONS_CREATE: 'examinations.create',
  EXAMINATIONS_UPDATE: 'examinations.update',
  EXAMINATIONS_APPROVE: 'examinations.approve',

  RADIOLOGY_READ: 'radiology.read',
  RADIOLOGY_CREATE: 'radiology.create',
  RADIOLOGY_REPORT: 'radiology.report',

  APPOINTMENTS_READ: 'appointments.read',
  APPOINTMENTS_MANAGE: 'appointments.manage',

  TRAININGS_READ: 'trainings.read',
  TRAININGS_MANAGE: 'trainings.manage',

  CERTIFICATES_READ: 'certificates.read',
  CERTIFICATES_MANAGE: 'certificates.manage',

  DOCUMENTS_READ: 'documents.read',
  DOCUMENTS_UPLOAD: 'documents.upload',
  DOCUMENTS_DELETE: 'documents.delete',

  REPORTS_EXPORT: 'reports.export',

  AUDIT_READ: 'audit.read',

  SYSTEM_MANAGE: 'system.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type PermissionCategory =
  | 'users'
  | 'roles'
  | 'companies'
  | 'employees'
  | 'workplaces'
  | 'examinations'
  | 'radiology'
  | 'appointments'
  | 'trainings'
  | 'certificates'
  | 'documents'
  | 'reports'
  | 'audit'
  | 'system';

export interface PermissionDefinition {
  key: Permission;
  category: PermissionCategory;
  description: string;
  /** Marks permissions that grant access to sensitive occupational-health (medical) data. */
  medical?: boolean;
}

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  { key: PERMISSIONS.USERS_READ, category: 'users', description: 'List and view users' },
  { key: PERMISSIONS.USERS_CREATE, category: 'users', description: 'Create users' },
  { key: PERMISSIONS.USERS_UPDATE, category: 'users', description: 'Update users' },
  { key: PERMISSIONS.USERS_DELETE, category: 'users', description: 'Deactivate/delete users' },
  { key: PERMISSIONS.ROLES_READ, category: 'roles', description: 'View roles and permissions' },
  {
    key: PERMISSIONS.ROLES_MANAGE,
    category: 'roles',
    description: 'Create/update roles and assign permissions',
  },
  {
    key: PERMISSIONS.COMPANIES_READ,
    category: 'companies',
    description: 'View companies and branches',
  },
  {
    key: PERMISSIONS.COMPANIES_CREATE,
    category: 'companies',
    description: 'Create companies and branches',
  },
  {
    key: PERMISSIONS.COMPANIES_UPDATE,
    category: 'companies',
    description: 'Update companies and branches',
  },
  {
    key: PERMISSIONS.COMPANIES_DELETE,
    category: 'companies',
    description: 'Delete companies and branches',
  },
  { key: PERMISSIONS.EMPLOYEES_READ, category: 'employees', description: 'View employees' },
  { key: PERMISSIONS.EMPLOYEES_CREATE, category: 'employees', description: 'Create employees' },
  { key: PERMISSIONS.EMPLOYEES_UPDATE, category: 'employees', description: 'Update employees' },
  { key: PERMISSIONS.EMPLOYEES_DELETE, category: 'employees', description: 'Delete employees' },
  { key: PERMISSIONS.WORKPLACES_READ, category: 'workplaces', description: 'View workplaces' },
  {
    key: PERMISSIONS.WORKPLACES_MANAGE,
    category: 'workplaces',
    description: 'Create/update workplaces',
  },
  {
    key: PERMISSIONS.EXAMINATIONS_READ,
    category: 'examinations',
    description: 'View medical examinations',
    medical: true,
  },
  {
    key: PERMISSIONS.EXAMINATIONS_CREATE,
    category: 'examinations',
    description: 'Create medical examinations',
    medical: true,
  },
  {
    key: PERMISSIONS.EXAMINATIONS_UPDATE,
    category: 'examinations',
    description: 'Update medical examinations',
    medical: true,
  },
  {
    key: PERMISSIONS.EXAMINATIONS_APPROVE,
    category: 'examinations',
    description: 'Approve medical examinations (physician)',
    medical: true,
  },
  {
    key: PERMISSIONS.RADIOLOGY_READ,
    category: 'radiology',
    description: 'View radiology requests and studies',
    medical: true,
  },
  {
    key: PERMISSIONS.RADIOLOGY_CREATE,
    category: 'radiology',
    description: 'Create radiology requests',
    medical: true,
  },
  {
    key: PERMISSIONS.RADIOLOGY_REPORT,
    category: 'radiology',
    description: 'Write radiology reports',
    medical: true,
  },
  {
    key: PERMISSIONS.APPOINTMENTS_READ,
    category: 'appointments',
    description: 'View appointments',
  },
  {
    key: PERMISSIONS.APPOINTMENTS_MANAGE,
    category: 'appointments',
    description: 'Create/update/cancel appointments',
  },
  { key: PERMISSIONS.TRAININGS_READ, category: 'trainings', description: 'View trainings' },
  { key: PERMISSIONS.TRAININGS_MANAGE, category: 'trainings', description: 'Manage trainings' },
  {
    key: PERMISSIONS.CERTIFICATES_READ,
    category: 'certificates',
    description: 'View certificates',
  },
  {
    key: PERMISSIONS.CERTIFICATES_MANAGE,
    category: 'certificates',
    description: 'Issue/revoke certificates',
  },
  {
    key: PERMISSIONS.DOCUMENTS_READ,
    category: 'documents',
    description: 'View and download documents',
  },
  { key: PERMISSIONS.DOCUMENTS_UPLOAD, category: 'documents', description: 'Upload documents' },
  { key: PERMISSIONS.DOCUMENTS_DELETE, category: 'documents', description: 'Delete documents' },
  { key: PERMISSIONS.REPORTS_EXPORT, category: 'reports', description: 'Export reports' },
  { key: PERMISSIONS.AUDIT_READ, category: 'audit', description: 'Read audit logs' },
  {
    key: PERMISSIONS.SYSTEM_MANAGE,
    category: 'system',
    description: 'Manage system-level settings and tenants',
  },
];

export const ALL_PERMISSIONS: readonly Permission[] = PERMISSION_DEFINITIONS.map((p) => p.key);

export const MEDICAL_PERMISSIONS: readonly Permission[] = PERMISSION_DEFINITIONS.filter(
  (p) => p.medical,
).map((p) => p.key);

/** Built-in role names created for every tenant by the seed script. */
export const SYSTEM_ROLES = {
  TENANT_ADMIN: 'tenant_admin',
  OCCUPATIONAL_PHYSICIAN: 'occupational_physician',
  SAFETY_SPECIALIST: 'safety_specialist',
  NURSE: 'nurse',
  COMPANY_REPRESENTATIVE: 'company_representative',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
