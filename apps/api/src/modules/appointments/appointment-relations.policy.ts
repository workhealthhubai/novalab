import { BadRequestException } from '@nestjs/common';

export interface AppointmentRelationIds {
  employeeId?: string;
  companyId?: string;
  examinationId?: string;
  radiologyRequestId?: string;
}

export interface AppointmentRelationContext {
  employee: { id: string; companyId: string | null } | null;
  company: { id: string } | null;
  examination: { id: string; employeeId: string } | null;
  radiologyRequest: { id: string; employeeId: string; examinationId: string | null } | null;
}

function invalid(message: string, errorCode: string): never {
  throw new BadRequestException({ message, errorCode });
}

/**
 * Validates tenant-scoped records resolved by the repository and prevents an
 * appointment from joining records that belong to different patients/companies.
 */
export function assertAppointmentRelations(
  ids: AppointmentRelationIds,
  context: AppointmentRelationContext,
): void {
  if (ids.employeeId && !context.employee)
    invalid('Employee not found in this tenant', 'INVALID_EMPLOYEE');
  if (ids.companyId && !context.company)
    invalid('Company not found in this tenant', 'INVALID_COMPANY');
  if (ids.examinationId && !context.examination)
    invalid('Examination not found in this tenant', 'INVALID_EXAMINATION');
  if (ids.radiologyRequestId && !context.radiologyRequest)
    invalid('Radiology request not found in this tenant', 'INVALID_RADIOLOGY_REQUEST');

  const patientIds = [
    context.employee?.id,
    context.examination?.employeeId,
    context.radiologyRequest?.employeeId,
  ].filter((value): value is string => Boolean(value));
  if (new Set(patientIds).size > 1)
    invalid('Appointment relations belong to different patients', 'PATIENT_RELATION_MISMATCH');

  if (context.company && context.employee && context.employee.companyId !== context.company.id)
    invalid('Employee does not belong to the selected company', 'COMPANY_RELATION_MISMATCH');

  if (
    context.examination &&
    context.radiologyRequest?.examinationId &&
    context.radiologyRequest.examinationId !== context.examination.id
  )
    invalid(
      'Radiology request does not belong to the selected examination',
      'EXAMINATION_RELATION_MISMATCH',
    );
}
