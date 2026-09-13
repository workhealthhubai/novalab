import type { OrthancStudy } from '@/infrastructure/orthanc/orthanc.types';

/** What the UI needs from a PACS study; Orthanc internals stay behind the API. */
export interface StudySummary {
  orthancStudyId: string;
  studyInstanceUid: string;
  /** ISO date (yyyy-mm-dd) or null when the DICOM tag is missing/invalid. */
  studyDate: string | null;
  studyTime: string | null;
  description: string | null;
  accessionNumber: string | null;
  modalities: string[];
  seriesCount: number;
  instanceCount: number;
  patientId: string | null;
  patientName: string | null;
  patientBirthDate: string | null;
  isStable: boolean;
}

export interface IncomingStudy extends StudySummary {
  requestId: string;
}

/** DICOM DA "20260908" → "2026-09-08". */
export function dicomDate(value: string | undefined): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(value ?? '');
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** DICOM TM "142530.123" → "14:25". */
export function dicomTime(value: string | undefined): string | null {
  const m = /^(\d{2})(\d{2})/.exec(value ?? '');
  return m ? `${m[1]}:${m[2]}` : null;
}

/** "YILMAZ^AYŞE^^Dr." → "AYŞE YILMAZ" (DICOM PN components: family^given^middle^prefix^suffix). */
export function dicomPersonName(value: string | undefined): string | null {
  if (!value) return null;
  const [family = '', given = '', middle = ''] = value.split('^');
  const name = [given, middle, family].filter(Boolean).join(' ').trim();
  return name || null;
}

export function toStudySummary(study: OrthancStudy): StudySummary {
  const tags = study.MainDicomTags;
  const requested = study.RequestedTags ?? {};
  const modalities = (requested.ModalitiesInStudy ?? '').split('\\').filter(Boolean);
  return {
    orthancStudyId: study.ID,
    studyInstanceUid: tags.StudyInstanceUID ?? '',
    studyDate: dicomDate(tags.StudyDate),
    studyTime: dicomTime(tags.StudyTime),
    description: tags.StudyDescription?.trim() || null,
    accessionNumber: tags.AccessionNumber?.trim() || null,
    modalities,
    seriesCount: Number(requested.NumberOfStudyRelatedSeries ?? study.Series?.length ?? 0) || 0,
    instanceCount: Number(requested.NumberOfStudyRelatedInstances ?? 0) || 0,
    patientId: study.PatientMainDicomTags.PatientID?.trim() || null,
    patientName: dicomPersonName(study.PatientMainDicomTags.PatientName),
    patientBirthDate: dicomDate(study.PatientMainDicomTags.PatientBirthDate),
    isStable: study.IsStable,
  };
}

/** Removes duplicates (same UID) and studies already linked to a request. */
export function unlinkedOnly(studies: StudySummary[], linked: ReadonlySet<string>): StudySummary[] {
  const seen = new Set<string>();
  return studies.filter((s) => {
    if (!s.studyInstanceUid || linked.has(s.studyInstanceUid) || seen.has(s.studyInstanceUid))
      return false;
    seen.add(s.studyInstanceUid);
    return true;
  });
}

/** PatientID is the tenant-owned employee UUID written to the modality/worklist. */
export function studyBelongsToEmployee(study: StudySummary, employeeId: string): boolean {
  return study.patientId === employeeId;
}

/** New orders require both PatientID and AccessionNumber; legacy orders only have PatientID. */
export function studyBelongsToRequest(
  study: StudySummary,
  request: { employeeId: string; accessionNumber: string | null },
): boolean {
  return (
    studyBelongsToEmployee(study, request.employeeId) &&
    (!request.accessionNumber || study.accessionNumber === request.accessionNumber)
  );
}
