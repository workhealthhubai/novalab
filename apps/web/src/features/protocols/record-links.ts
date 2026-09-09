import type { ProtocolItemType } from '@osgb/shared-types';
import { PATHS } from '@/app/router/navigation';
import { formatDate } from '@/features/patients/patient-utils';
import type { ProtocolRecords } from '@/types/protocol';

export interface RecordLink {
  id: string;
  label: string;
  to: string;
  alert?: boolean;
}

const RESULT_TR: Record<string, string> = {
  NORMAL: 'Normal',
  BORDERLINE: 'Sınırda',
  ABNORMAL: 'Anormal',
  OBSTRUCTIVE: 'Obstrüktif',
  RESTRICTIVE: 'Restriktif',
  MIXED: 'Mikst',
  NEGATIVE: 'Negatif',
  POSITIVE: 'Pozitif',
  NONE: 'Normal',
  GLASSES: 'Gözlük',
  REFERRAL: 'Sevk',
  FIT: 'Çalışabilir',
  FIT_WITH_RESTRICTIONS: 'Şartlı',
  UNFIT: 'Çalışamaz',
  PENDING: 'Karar bekliyor',
};

/** Links from a protocol item to the doctor-module records created for it. */
export function recordLinks(
  records: ProtocolRecords | undefined,
  type: ProtocolItemType,
): RecordLink[] {
  if (!records) return [];
  switch (type) {
    case 'AUDIOMETRY':
      return records.audiometry.map((r) => ({
        id: r.id,
        label: `${formatDate(r.performedAt)} · sağ ${r.ptaRight ?? '—'} / sol ${r.ptaLeft ?? '—'} dB`,
        to: PATHS.audiometryTest.replace(':testId', r.id),
      }));
    case 'SPIROMETRY':
      return records.spirometry.map((r) => ({
        id: r.id,
        label: `${formatDate(r.performedAt)} · ${r.pattern ? (RESULT_TR[r.pattern] ?? r.pattern) : 'patern yok'}`,
        to: PATHS.spirometryTest.replace(':testId', r.id),
        alert: r.pattern !== null && r.pattern !== 'NORMAL',
      }));
    case 'EYE':
      return records.eye.map((r) => ({
        id: r.id,
        label: `${formatDate(r.performedAt)} · ${RESULT_TR[r.recommendation] ?? r.recommendation}`,
        to: PATHS.eyeExamination.replace(':examId', r.id),
        alert: r.recommendation !== 'NONE',
      }));
    case 'ECG':
      return records.ecg.map((r) => ({
        id: r.id,
        label: `${formatDate(r.performedAt)} · ${r.heartRate ?? '—'}/dk · ${RESULT_TR[r.interpretation] ?? r.interpretation}`,
        to: PATHS.ecgRecord.replace(':recordId', r.id),
        alert: r.interpretation !== 'NORMAL',
      }));
    case 'PNEUMOCONIOSIS':
      return records.pneumoconiosis.map((r) => ({
        id: r.id,
        label: `${formatDate(r.readAt)} · ${r.profusion ?? 'okunamaz'} · ${RESULT_TR[r.result] ?? r.result}`,
        to: PATHS.pneumoconiosisReading.replace(':readingId', r.id),
        alert: r.result !== 'NEGATIVE',
      }));
    case 'RADIOLOGY':
      return records.radiology.map((r) => ({
        id: r.id,
        label:
          `${formatDate(r.requestedAt)} · ${r.modality} ${r.bodyPart ?? ''} · ${r.studyInstanceUid ? (r.reportedAt ? 'raporlandı' : 'görüntü var') : 'bekliyor'}`.trim(),
        to: PATHS.radiologyStudy.replace(':requestId', r.id),
      }));
    case 'HEALTH_REPORT':
      return records.healthReport
        ? [
            {
              id: records.healthReport.id,
              label: `${records.healthReport.performedAt ? formatDate(records.healthReport.performedAt) : 'tarih yok'} · ${RESULT_TR[records.healthReport.fitnessDecision] ?? records.healthReport.fitnessDecision}${records.healthReport.reportDocumentId ? ' · PDF' : ''}`,
              to: PATHS.healthReport.replace(':examinationId', records.healthReport.id),
              alert: records.healthReport.fitnessDecision === 'UNFIT',
            },
          ]
        : [];
    default:
      return [];
  }
}

/** Where a pending item is entered in the doctor module (with patient + protocol preselected). */
export function entryPath(
  type: ProtocolItemType,
  patientId: string,
  protocolId: string,
): string | null {
  const q = `?patientId=${patientId}&protocolId=${protocolId}`;
  switch (type) {
    case 'AUDIOMETRY':
      return `${PATHS.audiometryNew}${q}`;
    case 'SPIROMETRY':
      return `${PATHS.spirometryNew}${q}`;
    case 'EYE':
      return `${PATHS.eyeNew}${q}`;
    case 'ECG':
      return `${PATHS.ecgNew}${q}`;
    case 'PNEUMOCONIOSIS':
      return `${PATHS.pneumoconiosisNew}${q}`;
    case 'RADIOLOGY':
      return `${PATHS.radiology}?patientId=${patientId}&new=1`;
    default:
      return null;
  }
}
