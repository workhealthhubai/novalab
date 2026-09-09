/**
 * String enums shared by API and web. They mirror the Prisma enums in
 * apps/api/prisma/schema.prisma; keep both in sync.
 */
export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INVITED: 'INVITED',
  SUSPENDED: 'SUSPENDED',
  DISABLED: 'DISABLED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const TenantStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];

/** Turkish OHS law (6331) hazard classes: az tehlikeli / tehlikeli / çok tehlikeli. */
export const HazardClass = {
  LESS_HAZARDOUS: 'LESS_HAZARDOUS',
  HAZARDOUS: 'HAZARDOUS',
  VERY_HAZARDOUS: 'VERY_HAZARDOUS',
} as const;
export type HazardClass = (typeof HazardClass)[keyof typeof HazardClass];

export const EmployeeStatus = {
  ACTIVE: 'ACTIVE',
  ON_LEAVE: 'ON_LEAVE',
  TERMINATED: 'TERMINATED',
} as const;
export type EmployeeStatus = (typeof EmployeeStatus)[keyof typeof EmployeeStatus];

export const ExaminationType = {
  PRE_EMPLOYMENT: 'PRE_EMPLOYMENT',
  PERIODIC: 'PERIODIC',
  RETURN_TO_WORK: 'RETURN_TO_WORK',
  EXIT: 'EXIT',
  SPECIAL: 'SPECIAL',
} as const;
export type ExaminationType = (typeof ExaminationType)[keyof typeof ExaminationType];

export const ExaminationStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  APPROVED: 'APPROVED',
  CANCELLED: 'CANCELLED',
} as const;
export type ExaminationStatus = (typeof ExaminationStatus)[keyof typeof ExaminationStatus];

export const FitnessDecision = {
  PENDING: 'PENDING',
  FIT: 'FIT',
  FIT_WITH_RESTRICTIONS: 'FIT_WITH_RESTRICTIONS',
  UNFIT: 'UNFIT',
} as const;
export type FitnessDecision = (typeof FitnessDecision)[keyof typeof FitnessDecision];

export const RadiologyModality = {
  CR: 'CR',
  DX: 'DX',
  CT: 'CT',
  MR: 'MR',
  US: 'US',
  OT: 'OT',
} as const;
export type RadiologyModality = (typeof RadiologyModality)[keyof typeof RadiologyModality];

export const RadiologyRequestStatus = {
  REQUESTED: 'REQUESTED',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  REPORTED: 'REPORTED',
  CANCELLED: 'CANCELLED',
} as const;
export type RadiologyRequestStatus =
  (typeof RadiologyRequestStatus)[keyof typeof RadiologyRequestStatus];

export const AppointmentType = {
  EXAMINATION: 'EXAMINATION',
  RADIOLOGY: 'RADIOLOGY',
  TRAINING: 'TRAINING',
  CONSULTATION: 'CONSULTATION',
  OTHER: 'OTHER',
} as const;
export type AppointmentType = (typeof AppointmentType)[keyof typeof AppointmentType];

export const AppointmentStatus = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const DocumentCategory = {
  REPORT: 'REPORT',
  CERTIFICATE: 'CERTIFICATE',
  SCANNED_DOCUMENT: 'SCANNED_DOCUMENT',
  ATTACHMENT: 'ATTACHMENT',
  OTHER: 'OTHER',
} as const;
export type DocumentCategory = (typeof DocumentCategory)[keyof typeof DocumentCategory];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  TOKEN_REUSE_DETECTED: 'TOKEN_REUSE_DETECTED',
  MEDICAL_DATA_ACCESS: 'MEDICAL_DATA_ACCESS',
  EXPORT: 'EXPORT',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const IdentityVerificationStatus = {
  UNVERIFIED: 'UNVERIFIED',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
  /** Confirmed by a person against a physical document (no electronic source). */
  MANUAL: 'MANUAL',
} as const;
export type IdentityVerificationStatus =
  (typeof IdentityVerificationStatus)[keyof typeof IdentityVerificationStatus];
