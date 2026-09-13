import { BadRequestException, ConflictException } from '@nestjs/common';
import type { ExaminationStatus } from '@osgb/shared-types';

export const MUTABLE_EXAMINATION_STATUSES = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const satisfies readonly ExaminationStatus[];

export type MutableExaminationStatus = (typeof MUTABLE_EXAMINATION_STATUSES)[number];

const UPDATE_TRANSITIONS: Record<MutableExaminationStatus, readonly MutableExaminationStatus[]> = {
  SCHEDULED: ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  // A completed but unsigned examination may be reopened for correction.
  COMPLETED: ['COMPLETED', 'IN_PROGRESS', 'CANCELLED'],
  CANCELLED: ['CANCELLED'],
};

/**
 * Enforces the lifecycle used by ordinary examination edits. Approval is deliberately
 * excluded: it must go through the report approval flow that creates the immutable PDF
 * and records the approver metadata.
 */
export function assertExaminationUpdateTransition(
  current: ExaminationStatus,
  next: ExaminationStatus,
): asserts next is MutableExaminationStatus {
  if (current === 'APPROVED') {
    throw new BadRequestException({
      message: 'Approved examinations are read-only',
      errorCode: 'EXAMINATION_LOCKED',
    });
  }

  if (next === 'APPROVED') {
    throw new BadRequestException({
      message: 'Examinations can only be approved through the report approval endpoint',
      errorCode: 'APPROVAL_FLOW_REQUIRED',
    });
  }

  if (!UPDATE_TRANSITIONS[current].includes(next)) {
    throw new BadRequestException({
      message: `Invalid examination status transition: ${current} -> ${next}`,
      errorCode: 'INVALID_EXAMINATION_TRANSITION',
    });
  }
}

/** Approval is only legal from an examination that has actually started. */
export function assertExaminationApprovalTransition(current: ExaminationStatus): void {
  if (current === 'APPROVED') {
    throw new BadRequestException({
      message: 'Report is already approved',
      errorCode: 'ALREADY_APPROVED',
    });
  }

  if (current !== 'IN_PROGRESS' && current !== 'COMPLETED') {
    throw new BadRequestException({
      message: `Invalid examination status transition: ${current} -> APPROVED`,
      errorCode: 'INVALID_EXAMINATION_TRANSITION',
    });
  }
}

export function throwExaminationVersionConflict(): never {
  throw new ConflictException({
    message: 'The examination changed while this operation was in progress',
    errorCode: 'EXAMINATION_VERSION_CONFLICT',
  });
}
