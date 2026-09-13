import { toAuditJson } from './audit.service';

describe('audit payload sanitization', () => {
  it('removes clinical, identity, file and search values recursively', () => {
    expect(
      toAuditJson({
        status: 'COMPLETED',
        nested: {
          anamnesis: 'private clinical text',
          nationalId: '10000000146',
          fileName: 'Patient Name report.pdf',
          search: 'Patient Name',
        },
      }),
    ).toEqual({
      status: 'COMPLETED',
      nested: {
        anamnesis: '[REDACTED]',
        nationalId: '[REDACTED]',
        fileName: '[REDACTED]',
        search: '[REDACTED]',
      },
    });
  });

  it('drops query strings from audit paths', () => {
    expect(toAuditJson({ path: '/api/patients?search=10000000146' })).toEqual({
      path: '/api/patients',
    });
  });
});
