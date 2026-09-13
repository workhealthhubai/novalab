import { UnauthorizedException } from '@nestjs/common';
import { assertDicomWebRequestScope } from './dicomweb-access';

const uid = '1.2.826.0.1.3680043.8.498.1';

describe('DICOMweb request scope', () => {
  it.each([
    `/dicom-web/studies/${uid}/metadata`,
    `/dicom-web/studies/${uid}/series/2.3/instances/3.4/frames/1`,
    `/dicom-web/studies?StudyInstanceUID=${uid}&includefield=all`,
    `/dicom-web/studies?0020000D=${uid}`,
  ])('allows reads anchored to the token study: %s', (uri) => {
    expect(() => assertDicomWebRequestScope(uri, 'GET', uid)).not.toThrow();
  });

  it.each([
    '/dicom-web/studies',
    '/dicom-web/studies?PatientName=DOE%5EJOHN*',
    '/dicom-web/series/2.3',
    `/dicom-web/studies/${uid}9/metadata`,
    `/dicom-web/studies?StudyInstanceUID=${uid}&StudyInstanceUID=9.9.9`,
  ])('rejects archive-wide or different-study access: %s', (uri) => {
    expect(() => assertDicomWebRequestScope(uri, 'GET', uid)).toThrow(UnauthorizedException);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('rejects the %s method', (method) => {
    expect(() =>
      assertDicomWebRequestScope(`/dicom-web/studies/${uid}/metadata`, method, uid),
    ).toThrow(UnauthorizedException);
  });
});
