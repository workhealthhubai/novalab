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

/** Links from a protocol item to the doctor-module records created for it. */
export function recordLinks(
  records: ProtocolRecords | undefined,
  type: ProtocolItemType,
): RecordLink[] {
  if (!records) return [];
  switch (type) {
    case 'LAB':
    case 'ISG_REPORT':
      return (records.operations ?? [])
        .filter((r) => r.kind === (type === 'LAB' ? 'lab' : 'isg'))
        .map((r) => ({
          id: r.id,
          label: `${formatDate(r.date)} · ${r.status}`,
          to: `${type === 'LAB' ? PATHS.labResults : PATHS.isgReports}?protocolId=${r.protocolId}&recordId=${r.id}`,
        }));
    case 'AUDIOMETRY':
      return records.audiometry.map((r) => ({
        id: r.id,
        label: `${formatDate(r.performedAt)} · odyometri kaydı`,
        to: PATHS.audiometryTest.replace(':testId', r.id),
      }));
    case 'SPIROMETRY':
      return records.spirometry.map((r) => ({
        id: r.id,
        label: `${formatDate(r.performedAt)} · spirometri kaydı`,
        to: PATHS.spirometryTest.replace(':testId', r.id),
      }));
    case 'EYE':
      return records.eye.map((r) => ({
        id: r.id,
        label: `${formatDate(r.performedAt)} · göz muayenesi kaydı`,
        to: PATHS.eyeExamination.replace(':examId', r.id),
      }));
    case 'ECG':
      return records.ecg.map((r) => ({
        id: r.id,
        label: `${formatDate(r.performedAt)} · EKG kaydı`,
        to: PATHS.ecgRecord.replace(':recordId', r.id),
      }));
    case 'PNEUMOCONIOSIS':
      return records.pneumoconiosis.map((r) => ({
        id: r.id,
        label: `${formatDate(r.readAt)} · pnömokonyoz okuması`,
        to: PATHS.pneumoconiosisReading.replace(':readingId', r.id),
      }));
    case 'RADIOLOGY':
      return records.radiology.map((r) => ({
        id: r.id,
        label:
          `${formatDate(r.requestedAt)} · ${r.modality} ${r.bodyPart ?? ''} · ${r.status.toLocaleLowerCase('tr-TR')}`.trim(),
        to: PATHS.radiologyStudy.replace(':requestId', r.id),
      }));
    case 'HEALTH_REPORT':
      return records.healthReport
        ? [
            {
              id: records.healthReport.id,
              label: `${records.healthReport.performedAt ? formatDate(records.healthReport.performedAt) : 'tarih yok'} · rapor ${records.healthReport.status.toLocaleLowerCase('tr-TR')}`,
              to: PATHS.healthReport.replace(':examinationId', records.healthReport.id),
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
    case 'LAB':
      return `${PATHS.labResults}${q}`;
    case 'ISG_REPORT':
      return `${PATHS.isgReports}${q}`;
    default:
      return null;
  }
}
