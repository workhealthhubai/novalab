import type { Job } from 'bullmq';
import type { PinoLogger } from 'nestjs-pino';
import type { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { StorageService } from '@/infrastructure/storage/storage.service';

export interface GenerateEmployeeReportJobData {
  tenantId: string;
  employeeId: string;
  requestedByUserId: string;
  format: 'pdf';
}

export interface GenerateEmployeeReportJobResult {
  documentKey: string | null;
  employeeId: string;
}

export interface GenerateEmployeeReportDeps {
  prisma: PrismaService;
  storage: StorageService;
  logger: PinoLogger;
}

/**
 * Example background job: builds a report for one employee and stores it in MinIO.
 *
 * The heavy lifting (PDF rendering, templates) is intentionally left as a TODO -
 * this demonstrates the queue -> processor -> storage wiring with tenant scoping.
 */
export async function handleGenerateEmployeeReport(
  job: Job<GenerateEmployeeReportJobData>,
  deps: GenerateEmployeeReportDeps,
): Promise<GenerateEmployeeReportJobResult> {
  const { tenantId, employeeId } = job.data;

  // Tenant scoping is explicit even inside background jobs.
  const employee = await deps.prisma.employee.findFirst({
    where: { id: employeeId, tenantId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, companyId: true },
  });
  if (!employee) {
    deps.logger.warn(
      { jobId: job.id, tenantId, employeeId },
      'Employee not found; skipping report',
    );
    return { documentKey: null, employeeId };
  }

  await job.updateProgress(50);

  // TODO(business-logic): render a real PDF (e.g. with a template engine + headless renderer).
  const placeholder = Buffer.from(
    `Employee report placeholder\nEmployee: ${employee.firstName} ${employee.lastName}\nGenerated: ${new Date().toISOString()}\n`,
    'utf8',
  );
  const key = `${tenantId}/reports/employees/${employeeId}/${Date.now()}.txt`;
  await deps.storage.upload({
    key,
    body: placeholder,
    contentType: 'text/plain',
    size: placeholder.length,
  });

  await job.updateProgress(100);
  deps.logger.info({ jobId: job.id, tenantId, employeeId, key }, 'Employee report generated');
  return { documentKey: key, employeeId };
}
