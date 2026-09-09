import { PATHS } from '@/app/router/navigation';

export const BLOCKER_LABELS: Record<string, string> = {
  MISSING_PERFORMED_AT: 'Muayene tarihi girilmemiş',
  MISSING_DECISION: 'Çalışabilirlik kararı verilmemiş',
  MISSING_PHYSICIAN: 'İmzalayacak hekim seçilmemiş',
  MISSING_RESTRICTIONS: 'Şartlı karar için şartlar yazılmalı',
  MISSING_CONCLUSION: '"Çalışamaz" kararı için sonuç gerekçesi yazılmalı',
};

export const SMOKING_LABELS: Record<string, string> = {
  NEVER: 'Hiç içmemiş',
  FORMER: 'Bırakmış',
  CURRENT: 'İçiyor',
};
export const ALCOHOL_LABELS: Record<string, string> = {
  NONE: 'Kullanmıyor',
  OCCASIONAL: 'Ara sıra',
  REGULAR: 'Düzenli',
};
export const SYSTEM_STATUS_LABELS: Record<string, string> = {
  NORMAL: 'Normal',
  ABNORMAL: 'Anormal',
  NOT_EXAMINED: 'Bakılmadı',
};

export const TEST_MODULE_PATHS: Record<string, (id: string) => string> = {
  audiometry: (id) => PATHS.audiometryTest.replace(':testId', id),
  spirometry: (id) => PATHS.spirometryTest.replace(':testId', id),
  eye: (id) => PATHS.eyeExamination.replace(':examId', id),
  ecg: (id) => PATHS.ecgRecord.replace(':recordId', id),
  radiology: (id) => PATHS.radiologyStudy.replace(':requestId', id),
  pneumoconiosis: (id) => PATHS.pneumoconiosisReading.replace(':readingId', id),
};

export function reportPath(id: string): string {
  return PATHS.healthReport.replace(':examinationId', id);
}
