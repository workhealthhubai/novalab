import { visitBlockers } from './report-visit-readiness';
import { laboratoryLines } from './laboratory-summary';
import { laboratoryTestScope } from './report-test-selection.policy';

describe('clinical visit readiness', () => {
  it('rejects a pending ordered test, while excluding the health report itself', () => {
    expect(
      visitBlockers(
        {
          status: 'OPEN',
          items: [
            { type: 'LAB', status: 'PENDING' },
            { type: 'HEALTH_REPORT', status: 'PENDING' },
          ],
        },
        [],
      ),
    ).toEqual(['PENDING_TEST_LAB']);
  });
  it('does not accept a manual done flag without a linked clinical result', () => {
    expect(
      visitBlockers({ status: 'IN_PROGRESS', items: [{ type: 'LAB', status: 'DONE' }] }, []),
    ).toEqual(['MISSING_RESULT_LAB']);
  });
  it('does not require tests that were not ordered for this visit', () => {
    expect(
      visitBlockers(
        {
          status: 'IN_PROGRESS',
          items: [
            { type: 'LAB', status: 'DONE' },
            { type: 'ISG_REPORT', status: 'PENDING' },
          ],
        },
        [{ module: 'lab' }],
      ),
    ).toEqual([]);
  });
  it('requires a documented reason for a cancelled clinical order', () => {
    expect(
      visitBlockers({ status: 'IN_PROGRESS', items: [{ type: 'LAB', status: 'CANCELLED' }] }, []),
    ).toEqual(['CANCELLATION_REASON_LAB']);
    expect(
      visitBlockers(
        {
          status: 'IN_PROGRESS',
          items: [
            {
              type: 'LAB',
              status: 'CANCELLED',
              note: 'Hekim değerlendirmesiyle istem iptal edildi.',
            },
          ],
        },
        [],
      ),
    ).toEqual([]);
  });
  it('rejects cancelled, deleted and missing visits', () => {
    expect(visitBlockers(null)).toEqual(['MISSING_PROTOCOL']);
    expect(visitBlockers({ status: 'CANCELLED', items: [] })).toEqual(['PROTOCOL_CANCELLED']);
    expect(visitBlockers({ status: 'OPEN', deletedAt: new Date(), items: [] })).toEqual([
      'MISSING_PROTOCOL',
    ]);
  });
});
describe('laboratory inclusion', () => {
  it('selects only finalized records of the exact patient visit before approval', () => {
    const cutoff = new Date('2026-09-12T12:00:00Z');
    const report = { id: 'e', tenantId: 't', employeeId: 'p', protocolId: 'v' };
    expect(laboratoryTestScope(report, cutoff)).toEqual({
      tenantId: 't',
      kind: 'lab',
      protocolId: 'v',
      protocol: { tenantId: 't', employeeId: 'p', deletedAt: null },
      status: 'Tamamlandı',
      deletedAt: null,
      date: { lte: cutoff },
      updatedAt: { lte: cutoff },
    });
    expect(laboratoryTestScope({ ...report, protocolId: null }, cutoff)).toBeNull();
  });
  it('preserves multiline results, units, reference ranges and specimen identification', () => {
    expect(
      laboratoryLines({
        laboratory: 'Test Lab',
        sampleNumber: 'S1',
        sampleDate: '2026-09-12',
        content: 'Hb: 14 g/dL (12–16)\nGlukoz: 90 mg/dL (70–100)',
        notes: 'Kontrol edildi.',
      }),
    ).toEqual([
      'Laboratuvar: Test Lab',
      'Numune: S1',
      'Numune tarihi: 2026-09-12',
      'Hb: 14 g/dL (12–16)',
      'Glukoz: 90 mg/dL (70–100)',
      'Açıklama: Kontrol edildi.',
    ]);
  });
  it('does not treat empty or malformed result JSON as a clinical result', () => {
    expect(laboratoryLines({ content: '' })).toEqual([]);
    expect(laboratoryLines(null)).toEqual([]);
    expect(laboratoryLines({ content: 42 })).toEqual([]);
  });
});
