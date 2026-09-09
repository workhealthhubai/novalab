import { SetMetadata } from '@nestjs/common';

export const MEDICAL_DATA_KEY = 'medicalData';

export interface MedicalDataOptions {
  /** Entity type recorded in the access audit log, e.g. "Examination". */
  entityType: string;
  /** Route param that holds the entity id (default: "id"). */
  idParam?: string;
}

/**
 * Marks a handler/controller as accessing sensitive occupational-health data.
 * `MedicalDataGuard` enforces extra checks and records an access audit entry.
 * This is the extension point for stricter policies (purpose-of-use, break-glass, etc.).
 */
export const MedicalData = (options: MedicalDataOptions) => SetMetadata(MEDICAL_DATA_KEY, options);
