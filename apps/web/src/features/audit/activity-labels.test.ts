import { describe, expect, it } from 'vitest';
import type { ActivityEntry } from '@/types/audit';
import { activityPath, describeActivity } from './activity-labels';

const base: ActivityEntry = {
  id: 'a',
  userId: 'u',
  action: 'CREATE',
  entityType: 'Employee',
  entityId: 'e1',
  oldValue: null,
  newValue: null,
  ipAddress: null,
  userAgent: null,
  requestId: null,
  metadata: null,
  createdAt: '2026-09-09T08:00:00.000Z',
  user: null,
  category: 'PATIENT',
  technical: false,
  entityLabel: 'Ayşe Yılmaz',
  patientId: 'e1',
};

describe('activity sentences', () => {
  it('describes patient, protocol, report and test rows', () => {
    expect(describeActivity(base)).toBe('Ayşe Yılmaz hastasını kaydetti');
    expect(
      describeActivity({
        ...base,
        entityType: 'Protocol',
        entityLabel: '2026-000004 · Ayşe Yılmaz',
        action: 'UPDATE',
        newValue: { status: 'COMPLETED' },
      }),
    ).toBe('2026-000004 · Ayşe Yılmaz protokolünü kapattı');
    expect(
      describeActivity({
        ...base,
        entityType: 'Protocol',
        entityLabel: '2026-000004',
        action: 'UPDATE',
        newValue: { changedFields: ['item:AUDIOMETRY'] },
      }),
    ).toBe('2026-000004 protokolünde AUDIOMETRY kalemini güncelledi');
    expect(
      describeActivity({
        ...base,
        entityType: 'Examination',
        action: 'UPDATE',
        newValue: { status: 'APPROVED', reportNo: '2026-AB12' },
      }),
    ).toBe('Ayşe Yılmaz sağlık raporunu onayladı (2026-AB12)');
    expect(
      describeActivity({ ...base, entityType: 'AudiometryTest', action: 'MEDICAL_DATA_ACCESS' }),
    ).toBe('Ayşe Yılmaz · odyometri testi kayıtlarını görüntüledi');
    expect(
      describeActivity({ ...base, action: 'LOGIN', entityType: 'Auth', entityLabel: null }),
    ).toBe('giriş yaptı');
  });

  it('links rows to their pages', () => {
    expect(activityPath(base)).toBe('/patient-registration/patients/e1');
    expect(activityPath({ ...base, entityType: 'Protocol', entityId: 'p1' })).toBe(
      '/patient-registration/protocols/p1',
    );
    expect(activityPath({ ...base, entityType: 'Document', entityId: 'd1', patientId: 'e1' })).toBe(
      '/patient-registration/patients/e1',
    );
    expect(activityPath({ ...base, entityType: 'Role', entityId: 'r1' })).toBeNull();
  });
});
