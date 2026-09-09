import type { OrthancStudy } from '@/infrastructure/orthanc/orthanc.types';
import {
  dicomDate,
  dicomPersonName,
  dicomTime,
  toStudySummary,
  unlinkedOnly,
} from './study-summary';

function study(
  overrides: Partial<OrthancStudy['MainDicomTags']> = {},
  id = 'orth-1',
): OrthancStudy {
  return {
    ID: id,
    ParentPatient: 'pat-1',
    Series: ['s1', 's2'],
    IsStable: true,
    LastUpdate: '20260908T100000',
    Type: 'Study',
    MainDicomTags: {
      StudyInstanceUID: '1.2.3',
      StudyDate: '20260908',
      StudyTime: '142530',
      StudyDescription: ' CHEST ',
      ...overrides,
    },
    PatientMainDicomTags: {
      PatientID: 'emp-1',
      PatientName: 'YILMAZ^AYŞE',
      PatientBirthDate: '19900115',
    },
    RequestedTags: {
      ModalitiesInStudy: 'CR\\DX',
      NumberOfStudyRelatedSeries: '2',
      NumberOfStudyRelatedInstances: '5',
    },
  };
}

describe('study summary', () => {
  it('converts DICOM dates, times and person names', () => {
    expect(dicomDate('20260908')).toBe('2026-09-08');
    expect(dicomDate('bad')).toBeNull();
    expect(dicomTime('142530.123')).toBe('14:25');
    expect(dicomPersonName('YILMAZ^AYŞE^NUR')).toBe('AYŞE NUR YILMAZ');
    expect(dicomPersonName('')).toBeNull();
  });

  it('maps an Orthanc study to the UI summary', () => {
    const summary = toStudySummary(study());
    expect(summary).toMatchObject({
      orthancStudyId: 'orth-1',
      studyInstanceUid: '1.2.3',
      studyDate: '2026-09-08',
      studyTime: '14:25',
      description: 'CHEST',
      modalities: ['CR', 'DX'],
      seriesCount: 2,
      instanceCount: 5,
      patientId: 'emp-1',
      patientName: 'AYŞE YILMAZ',
      patientBirthDate: '1990-01-15',
    });
  });

  it('falls back to the series list when computed tags are missing', () => {
    const s = study();
    delete s.RequestedTags;
    expect(toStudySummary(s).seriesCount).toBe(2);
    expect(toStudySummary(s).modalities).toEqual([]);
  });

  it('filters linked and duplicate studies', () => {
    const a = toStudySummary(study({ StudyInstanceUID: '1.1' }, 'a'));
    const b = toStudySummary(study({ StudyInstanceUID: '1.2' }, 'b'));
    const dup = toStudySummary(study({ StudyInstanceUID: '1.2' }, 'c'));
    expect(unlinkedOnly([a, b, dup], new Set(['1.1'])).map((s) => s.orthancStudyId)).toEqual(['b']);
  });
});
