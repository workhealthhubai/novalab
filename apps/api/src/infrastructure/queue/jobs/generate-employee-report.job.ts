import type { Job } from 'bullmq';
import type { PinoLogger } from 'nestjs-pino';
import type { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { StorageService } from '@/infrastructure/storage/storage.service';
import { createWriter, formatIstanbul } from '@/modules/signatures/pdf-builder';

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
 * Builds a concise, non-clinical employee summary as a downloadable PDF.
 * Detailed clinical reports remain under the physician approval workflow.
 */
export async function handleGenerateEmployeeReport(
  job: Job<GenerateEmployeeReportJobData>,
  deps: GenerateEmployeeReportDeps,
): Promise<GenerateEmployeeReportJobResult> {
  const { tenantId, employeeId } = job.data;

  // Tenant scoping is explicit even inside background jobs.
  const employee = await deps.prisma.employee.findFirst({
    where: { id: employeeId, tenantId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      registrationNumber: true,
      jobTitle: true,
      department: true,
      hireDate: true,
      status: true,
      company: { select: { name: true } },
      occupation: { select: { name: true } },
      examinations: {
        where: { deletedAt: null },
        orderBy: { performedAt: 'desc' },
        take: 5,
        select: { type: true, status: true, performedAt: true, nextExaminationDue: true },
      },
    },
  });
  if (!employee) {
    deps.logger.warn(
      { jobId: job.id, tenantId, employeeId },
      'Employee not found; skipping report',
    );
    return { documentKey: null, employeeId };
  }

  await job.updateProgress(50);

  const { doc, writer } = await createWriter({
    title: 'Çalışan Özet Raporu',
    subject: `${employee.firstName} ${employee.lastName}`,
    footer: `Çalışan özeti · ${employee.id}`,
  });
  writer.text('Çalışan Özet Raporu', { size: 16, bold: true });
  writer.text(`Oluşturulma: ${formatIstanbul(new Date())}`, { size: 8, gapAfter: 6 });
  writer.rule();
  writer.keyValue('Ad Soyad', `${employee.firstName} ${employee.lastName}`);
  writer.keyValue('Sicil No', employee.registrationNumber ?? '—');
  writer.keyValue('Firma', employee.company?.name ?? '—');
  writer.keyValue(
    'Birim / görev',
    [employee.department, employee.occupation?.name ?? employee.jobTitle]
      .filter(Boolean)
      .join(' · ') || '—',
  );
  writer.keyValue(
    'İşe giriş',
    employee.hireDate ? formatIstanbul(employee.hireDate).slice(0, 10) : '—',
  );
  writer.keyValue('Durum', employee.status === 'ACTIVE' ? 'Aktif' : employee.status);
  writer.rule();
  writer.text('Son muayeneler', { bold: true, gapAfter: 2 });
  if (employee.examinations.length === 0) writer.text('Kayıtlı muayene bulunmuyor.');
  for (const examination of employee.examinations) {
    writer.keyValue(
      examination.performedAt ? formatIstanbul(examination.performedAt) : 'Planlanmış',
      `${examination.type} · ${examination.status}${examination.nextExaminationDue ? ` · sonraki: ${formatIstanbul(examination.nextExaminationDue).slice(0, 10)}` : ''}`,
    );
  }
  const report = Buffer.from(await doc.save());
  const key = `${tenantId}/reports/employees/${employeeId}/${Date.now()}.pdf`;
  await deps.storage.upload({
    key,
    body: report,
    contentType: 'application/pdf',
    size: report.length,
  });

  await job.updateProgress(100);
  deps.logger.info({ jobId: job.id, tenantId, employeeId }, 'Employee report generated');
  return { documentKey: key, employeeId };
}
