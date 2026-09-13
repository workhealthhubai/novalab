import type { DocumentCategory } from '@osgb/shared-types';

const ALWAYS_MEDICAL_CATEGORIES = new Set<DocumentCategory>([
  'REPORT',
  'ECG_TRACE',
  'SPIROMETRY_TRACE',
]);

/** Clients may make classification stricter, but can never downgrade a medical relation/category. */
export function isMedicalDocument(input: {
  requestedMedical?: boolean;
  category: DocumentCategory;
  examinationId?: string;
}): boolean {
  return Boolean(
    input.requestedMedical || input.examinationId || ALWAYS_MEDICAL_CATEGORIES.has(input.category),
  );
}
