import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { AuthenticatedUser } from '@/common/interfaces';
import type { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { AuditService } from '@/modules/audit/audit.service';
import type { EmployeesRepository } from '@/modules/employees/employees.repository';
import { UpdateExaminationDto } from './dto/update-examination.dto';
import {
  assertExaminationApprovalTransition,
  assertExaminationUpdateTransition,
} from './examination-status.policy';
import type { ExaminationsRepository } from './examinations.repository';
import { ExaminationsService } from './examinations.service';

function errorCode(error: unknown): unknown {
  return error instanceof BadRequestException
    ? (error.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

describe('examination status policy', () => {
  it('rejects APPROVED in the public update DTO', async () => {
    const dto = plainToInstance(UpdateExaminationDto, { status: 'APPROVED' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('status');
  });

  it('allows ordinary forward transitions and an explicit pre-approval correction', () => {
    expect(() => assertExaminationUpdateTransition('SCHEDULED', 'IN_PROGRESS')).not.toThrow();
    expect(() => assertExaminationUpdateTransition('IN_PROGRESS', 'COMPLETED')).not.toThrow();
    expect(() => assertExaminationUpdateTransition('COMPLETED', 'IN_PROGRESS')).not.toThrow();
  });

  it('requires the dedicated report flow for approval', () => {
    expect(() => assertExaminationUpdateTransition('COMPLETED', 'APPROVED')).toThrow(
      BadRequestException,
    );

    try {
      assertExaminationUpdateTransition('COMPLETED', 'APPROVED');
    } catch (error) {
      expect(errorCode(error)).toBe('APPROVAL_FLOW_REQUIRED');
    }
  });

  it('keeps approved and cancelled examinations terminal for ordinary updates', () => {
    for (const [current, next, code] of [
      ['APPROVED', 'APPROVED', 'EXAMINATION_LOCKED'],
      ['CANCELLED', 'IN_PROGRESS', 'INVALID_EXAMINATION_TRANSITION'],
    ] as const) {
      try {
        assertExaminationUpdateTransition(current, next);
        throw new Error('Expected transition to be rejected');
      } catch (error) {
        expect(errorCode(error)).toBe(code);
      }
    }
  });

  it('allows approval only after the examination has started', () => {
    expect(() => assertExaminationApprovalTransition('IN_PROGRESS')).not.toThrow();
    expect(() => assertExaminationApprovalTransition('COMPLETED')).not.toThrow();
    expect(() => assertExaminationApprovalTransition('SCHEDULED')).toThrow(BadRequestException);
    expect(() => assertExaminationApprovalTransition('CANCELLED')).toThrow(BadRequestException);
  });
});

describe('ExaminationsService status enforcement', () => {
  const actor = { id: 'user-1' } as AuthenticatedUser;
  const examinations = {
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<ExaminationsRepository>;
  const audit = { log: jest.fn() } as unknown as jest.Mocked<AuditService>;
  const service = new ExaminationsService(
    examinations,
    {} as EmployeesRepository,
    audit,
    {} as PrismaService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('does not allow a caller that reaches update() to bypass approval', async () => {
    examinations.findById.mockResolvedValue({
      id: 'exam-1',
      status: 'COMPLETED',
    } as never);

    await expect(
      service.update(
        'tenant-1',
        actor,
        'exam-1',
        { status: 'APPROVED' } as unknown as UpdateExaminationDto,
        {},
      ),
    ).rejects.toMatchObject({ response: { errorCode: 'APPROVAL_FLOW_REQUIRED' } });
    expect(examinations.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});
