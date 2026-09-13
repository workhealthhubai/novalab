import { ForbiddenException } from '@nestjs/common';
import { assertSigningPhysicianOwnership } from './report-approval.policy';

const activePhysician = {
  userId: 'doctor-1',
  status: 'ACTIVE' as const,
  user: { status: 'ACTIVE' as const, deletedAt: null },
};

function errorCode(error: unknown): unknown {
  return error instanceof ForbiddenException
    ? (error.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

describe('report approval physician policy', () => {
  it('accepts the active profile linked to the authenticated physician', () => {
    expect(() => assertSigningPhysicianOwnership(activePhysician, 'doctor-1')).not.toThrow();
  });

  it('rejects signing with another physician profile', () => {
    try {
      assertSigningPhysicianOwnership(activePhysician, 'doctor-2');
      throw new Error('Expected ownership check to fail');
    } catch (error) {
      expect(errorCode(error)).toBe('PHYSICIAN_ACCOUNT_MISMATCH');
    }
  });

  it('rejects a profile without a linked login account', () => {
    try {
      assertSigningPhysicianOwnership({ ...activePhysician, userId: null, user: null }, 'doctor-1');
      throw new Error('Expected ownership check to fail');
    } catch (error) {
      expect(errorCode(error)).toBe('PHYSICIAN_ACCOUNT_MISMATCH');
    }
  });

  it('rejects an inactive physician profile', () => {
    try {
      assertSigningPhysicianOwnership({ ...activePhysician, status: 'INACTIVE' }, 'doctor-1');
      throw new Error('Expected status check to fail');
    } catch (error) {
      expect(errorCode(error)).toBe('PHYSICIAN_INACTIVE');
    }
  });

  it.each([
    { status: 'SUSPENDED' as const, deletedAt: null },
    { status: 'ACTIVE' as const, deletedAt: new Date() },
  ])('rejects an inactive or deleted linked account', (user) => {
    try {
      assertSigningPhysicianOwnership({ ...activePhysician, user }, 'doctor-1');
      throw new Error('Expected account check to fail');
    } catch (error) {
      expect(errorCode(error)).toBe('PHYSICIAN_ACCOUNT_INACTIVE');
    }
  });
});
