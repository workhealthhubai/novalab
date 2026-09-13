import { protocolTestScope, radiologyTestScope } from './report-test-selection.policy';

const cutoff = new Date('2026-09-12T12:00:00.000Z');
const report = {
  id: 'examination-1',
  tenantId: 'tenant-1',
  employeeId: 'employee-1',
  protocolId: 'protocol-1',
};

describe('report test selection policy', () => {
  it('selects only tests linked to the exact tenant, patient and protocol before approval', () => {
    expect(protocolTestScope(report, 'performedAt', cutoff)).toEqual({
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      protocolId: 'protocol-1',
      deletedAt: null,
      performedAt: { lte: cutoff },
    });
  });

  it("does not silently fall back to a patient's previous visit", () => {
    expect(protocolTestScope({ ...report, protocolId: null }, 'performedAt', cutoff)).toBeNull();
  });

  it('selects radiology only through its exact examination relation', () => {
    expect(radiologyTestScope(report, cutoff)).toMatchObject({
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      examinationId: 'examination-1',
      requestedAt: { lte: cutoff },
    });
  });
});
