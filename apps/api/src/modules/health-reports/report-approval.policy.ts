import { ForbiddenException } from '@nestjs/common';
import type { PhysicianStatus, UserStatus } from '@osgb/shared-types';

export interface SigningPhysicianIdentity {
  userId: string | null;
  status: PhysicianStatus;
  user: { status: UserStatus; deletedAt: Date | null } | null;
}

/**
 * A report may only be signed with the active physician profile linked to the
 * authenticated approver. This also binds any stored signature image to its owner.
 */
export function assertSigningPhysicianOwnership(
  physician: SigningPhysicianIdentity,
  actorId: string,
): void {
  if (physician.status !== 'ACTIVE') {
    throw new ForbiddenException({
      message: 'Inactive physicians cannot approve reports',
      errorCode: 'PHYSICIAN_INACTIVE',
    });
  }

  if (physician.userId !== actorId) {
    throw new ForbiddenException({
      message: 'The signing physician profile is not linked to the authenticated user',
      errorCode: 'PHYSICIAN_ACCOUNT_MISMATCH',
    });
  }

  if (!physician.user || physician.user.status !== 'ACTIVE' || physician.user.deletedAt) {
    throw new ForbiddenException({
      message: 'The physician account is inactive',
      errorCode: 'PHYSICIAN_ACCOUNT_INACTIVE',
    });
  }
}
