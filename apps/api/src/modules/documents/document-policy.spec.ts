import { isMedicalDocument } from './document-policy';

describe('document medical classification', () => {
  it.each(['REPORT', 'ECG_TRACE', 'SPIROMETRY_TRACE'] as const)(
    'forces %s documents to medical',
    (category) => {
      expect(isMedicalDocument({ category, requestedMedical: false })).toBe(true);
    },
  );

  it('forces any examination-linked document to medical', () => {
    expect(
      isMedicalDocument({
        category: 'ATTACHMENT',
        requestedMedical: false,
        examinationId: 'exam-1',
      }),
    ).toBe(true);
  });

  it('allows clients to make an otherwise administrative document medical', () => {
    expect(isMedicalDocument({ category: 'OTHER', requestedMedical: true })).toBe(true);
    expect(isMedicalDocument({ category: 'OTHER', requestedMedical: false })).toBe(false);
  });
});
