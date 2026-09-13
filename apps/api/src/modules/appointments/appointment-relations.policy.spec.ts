import { BadRequestException } from '@nestjs/common';
import {
  assertAppointmentRelations,
  type AppointmentRelationContext,
  type AppointmentRelationIds,
} from './appointment-relations.policy';

const ids: AppointmentRelationIds = {
  employeeId: 'employee-1',
  companyId: 'company-1',
  examinationId: 'exam-1',
  radiologyRequestId: 'radiology-1',
};
const context: AppointmentRelationContext = {
  employee: { id: 'employee-1', companyId: 'company-1' },
  company: { id: 'company-1' },
  examination: { id: 'exam-1', employeeId: 'employee-1' },
  radiologyRequest: {
    id: 'radiology-1',
    employeeId: 'employee-1',
    examinationId: 'exam-1',
  },
};

describe('assertAppointmentRelations', () => {
  it('accepts a consistent tenant-scoped relation graph', () => {
    expect(() => assertAppointmentRelations(ids, context)).not.toThrow();
  });

  it('rejects a relation that was not resolved inside the tenant', () => {
    expect(() => assertAppointmentRelations(ids, { ...context, company: null })).toThrow(
      BadRequestException,
    );
  });

  it('rejects records for different patients', () => {
    expect(() =>
      assertAppointmentRelations(ids, {
        ...context,
        examination: { id: 'exam-1', employeeId: 'employee-2' },
      }),
    ).toThrow('Appointment relations belong to different patients');
  });

  it('rejects a company that does not employ the selected patient', () => {
    expect(() =>
      assertAppointmentRelations(ids, {
        ...context,
        employee: { id: 'employee-1', companyId: 'company-2' },
      }),
    ).toThrow('Employee does not belong to the selected company');
  });

  it('rejects a radiology request attached to a different examination', () => {
    expect(() =>
      assertAppointmentRelations(ids, {
        ...context,
        radiologyRequest: {
          id: 'radiology-1',
          employeeId: 'employee-1',
          examinationId: 'exam-2',
        },
      }),
    ).toThrow('Radiology request does not belong to the selected examination');
  });
});
