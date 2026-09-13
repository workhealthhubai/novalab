import { buildOrthancWorklist, createAccessionNumber } from './dicom-worklist';

describe('DICOM modality worklist', () => {
  it('creates a DICOM SH-compatible accession number', () => {
    expect(createAccessionNumber()).toMatch(/^NL[A-F0-9]{14}$/);
  });

  it('builds a patient/order worklist scoped to the station AE Title', () => {
    const payload = buildOrthancWorklist(
      {
        id: 'employee-1',
        firstName: 'Ayşe',
        lastName: 'Yılmaz',
        birthDate: new Date('1990-01-15T00:00:00.000Z'),
        gender: 'FEMALE',
      },
      {
        accessionNumber: 'NL0123456789ABCD',
        modality: 'CR',
        bodyPart: 'CHEST',
        clinicalInfo: 'PA akciğer\nkontrol',
        requestedAt: new Date('2026-09-12T09:15:30.000Z'),
        scheduledStationAet: 'XRAY01',
      },
    );
    expect(payload.Tags).toMatchObject({
      SpecificCharacterSet: 'ISO_IR 192',
      PatientID: 'employee-1',
      PatientName: 'Yılmaz^Ayşe',
      PatientBirthDate: '19900115',
      PatientSex: 'F',
      AccessionNumber: 'NL0123456789ABCD',
      RequestedProcedureID: 'NL0123456789ABCD',
      ReasonForTheRequestedProcedure: 'PA akciğer kontrol',
      ScheduledProcedureStepSequence: [
        {
          ScheduledStationAETitle: 'XRAY01',
          ScheduledProcedureStepStartDate: '20260912',
          ScheduledProcedureStepStartTime: '091530',
          Modality: 'CR',
        },
      ],
    });
  });
});
