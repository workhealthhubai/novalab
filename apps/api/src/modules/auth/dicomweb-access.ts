import { UnauthorizedException } from '@nestjs/common';

function deny(): never {
  throw new UnauthorizedException({
    message: 'The viewer session does not authorize this DICOMweb request',
    errorCode: 'DICOMWEB_SCOPE_VIOLATION',
  });
}

/**
 * Allows only read requests whose DICOMweb path is anchored to the single study
 * in the viewer token. Archive-wide QIDO and top-level series/instance access are denied.
 */
export function assertDicomWebRequestScope(
  originalUri: string,
  originalMethod: string,
  studyInstanceUid: string,
): void {
  if (originalMethod !== 'GET' && originalMethod !== 'HEAD') deny();

  let url: URL;
  try {
    url = new URL(originalUri, 'http://dicomweb.internal');
  } catch {
    deny();
  }

  const prefix = '/dicom-web/studies';
  if (url.pathname === prefix || url.pathname === `${prefix}/`) {
    const values = [
      ...url.searchParams.getAll('StudyInstanceUID'),
      ...url.searchParams.getAll('0020000D'),
    ];
    if (values.length !== 1 || values[0] !== studyInstanceUid) deny();
    return;
  }

  if (!url.pathname.startsWith(`${prefix}/`)) deny();
  const encodedStudyUid = url.pathname.slice(prefix.length + 1).split('/')[0];
  let requestedStudyUid: string;
  try {
    requestedStudyUid = decodeURIComponent(encodedStudyUid ?? '');
  } catch {
    deny();
  }
  if (requestedStudyUid !== studyInstanceUid) deny();
}
