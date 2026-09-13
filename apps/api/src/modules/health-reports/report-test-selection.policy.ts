export interface ReportTestAnchor {
  id: string;
  tenantId: string;
  employeeId: string;
  protocolId: string | null;
}

/** Tests without an explicit visit/protocol link are never selected implicitly. */
export function protocolTestScope(
  report: ReportTestAnchor,
  timestampField: 'performedAt' | 'readAt',
  cutoff: Date,
) {
  if (!report.protocolId) return null;
  return {
    tenantId: report.tenantId,
    employeeId: report.employeeId,
    protocolId: report.protocolId,
    deletedAt: null,
    [timestampField]: { lte: cutoff },
  };
}

/** Radiology has a direct examination relation; a date-window match is not ownership. */
export function radiologyTestScope(report: ReportTestAnchor, cutoff: Date) {
  return {
    tenantId: report.tenantId,
    employeeId: report.employeeId,
    examinationId: report.id,
    deletedAt: null,
    requestedAt: { lte: cutoff },
    status: { in: ['REPORTED'] as RadiologyRequestStatus[] },
  };
}
import type { RadiologyRequestStatus } from '@/generated/prisma/client';

/** Operations store patient ownership through the protocol, not a free-text JSON field. */
export function laboratoryTestScope(report: ReportTestAnchor, cutoff: Date) {
  if (!report.protocolId) return null;
  return {
    tenantId: report.tenantId,
    kind: 'lab',
    protocolId: report.protocolId,
    protocol: { tenantId: report.tenantId, employeeId: report.employeeId, deletedAt: null },
    status: 'Tamamlandı',
    deletedAt: null,
    date: { lte: cutoff },
    updatedAt: { lte: cutoff },
  };
}
