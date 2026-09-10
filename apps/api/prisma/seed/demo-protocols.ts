/* eslint-disable no-console */
/**
 * Demo seed, part 3: protocols with ordered items and per-year counters, examinations with
 * anamnesis / systems exam / measurements, and the approved Ek-2 report PDFs.
 */
import type { $Enums, Prisma } from '../../src/generated/prisma/client';
import { buildReportPdf } from '../../src/modules/health-reports/report-pdf';
import { createDocument, type DemoContext } from './demo-context';
import { birthDateOf, companyId, employeeId, employeeSpec } from './demo-definitions';
import { examinationId, PROTOCOLS, protocolId, type ProtocolPlan } from './demo-plan';
import { addMinutes, daysAgo, signaturePng, tcKimlikNo, uid } from './lib';

const ITEM_ORDER: $Enums.ProtocolItemType[] = [
  'RADIOLOGY',
  'AUDIOMETRY',
  'ECG',
  'SPIROMETRY',
  'EYE',
  'PNEUMOCONIOSIS',
  'LAB',
  'HEALTH_REPORT',
  'ISG_REPORT',
];

export function openedAtOf(plan: ProtocolPlan): Date {
  return daysAgo(plan.daysAgo, plan.hour ?? 9, (plan.sequence * 11) % 60);
}

export async function seedProtocols(ctx: DemoContext): Promise<void> {
  const { prisma, tenantId } = ctx;
  const counters = new Map<number, number>();
  for (const plan of PROTOCOLS) {
    const openedAt = openedAtOf(plan);
    const closed = plan.status === 'COMPLETED' || plan.status === 'CANCELLED';
    const closedAt = closed ? addMinutes(openedAt, plan.status === 'COMPLETED' ? 240 : 60) : null;
    const spec = employeeSpec(plan.employee);
    await prisma.protocol.upsert({
      where: { id: protocolId(plan.key) },
      create: {
        id: protocolId(plan.key),
        tenantId,
        protocolNumber: `${plan.year}-${String(plan.sequence).padStart(6, '0')}`,
        year: plan.year,
        sequence: plan.sequence,
        employeeId: employeeId(plan.employee),
        companyId: spec.company ? companyId(spec.company) : null,
        type: plan.type,
        status: plan.status,
        openedAt,
        closedAt,
        openedById: ctx.users[plan.openedBy].id,
        closedById: plan.closedBy ? ctx.users[plan.closedBy].id : null,
        notes: plan.notes ?? null,
        createdAt: openedAt,
        items: {
          create: ITEM_ORDER.filter((type) => plan.items[type]).map((type, orderIndex) => {
            const state = plan.items[type]!;
            return {
              id: uid(`item:${plan.key}:${type}`),
              tenantId,
              type,
              status: state,
              orderIndex,
              completedAt: state === 'DONE' ? addMinutes(openedAt, 30 + orderIndex * 25) : null,
              note:
                state === 'DONE' && type === 'LAB'
                  ? 'Numuneler alındı; sonuçlar dosyaya eklendi.'
                  : state === 'CANCELLED'
                    ? 'İptal edildi'
                    : null,
              createdAt: openedAt,
            };
          }),
        },
      },
      update: {},
    });
    counters.set(plan.year, Math.max(counters.get(plan.year) ?? 0, plan.sequence));
  }
  for (const [year, last] of counters) {
    await prisma.protocolCounter.upsert({
      where: { tenantId_year: { tenantId, year } },
      create: { tenantId, year, last },
      update: { last },
    });
  }
  console.log(`✔ ${PROTOCOLS.length} protocols (${[...counters.keys()].sort().join(', ')})`);
}

/** Examinations without the report PDF (approval happens after the test modules exist). */
export async function seedExaminations(ctx: DemoContext): Promise<void> {
  const { prisma, tenantId } = ctx;
  let count = 0;
  for (const plan of PROTOCOLS) {
    if (!plan.exam) continue;
    const exam = plan.exam;
    const openedAt = openedAtOf(plan);
    const scheduled = exam.status === 'SCHEDULED';
    const performedAt = scheduled ? null : addMinutes(openedAt, 45);
    const nextDue =
      exam.nextDueMonths && performedAt
        ? new Date(
            Date.UTC(
              performedAt.getFullYear(),
              performedAt.getMonth() + exam.nextDueMonths,
              performedAt.getDate(),
              12,
            ),
          )
        : null;
    const physicianUserId =
      exam.physician === 'aksoy' ? ctx.users.radiologist.id : ctx.users.physician.id;
    const id = examinationId(plan.key);
    await prisma.examination.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        employeeId: employeeId(plan.employee),
        protocolId: protocolId(plan.key),
        type: plan.type,
        status: exam.status,
        scheduledAt: scheduled ? daysAgo(-1, 9, 30) : openedAt,
        performedAt,
        physicianId: physicianUserId,
        findings: exam.findings ?? null,
        conclusion: exam.conclusion ?? null,
        fitnessDecision: exam.decision,
        restrictions: exam.restrictions ?? null,
        nextExaminationDue: nextDue,
        anamnesis: Object.keys(exam.anamnesis).length
          ? (exam.anamnesis as Prisma.InputJsonValue)
          : undefined,
        systemsExam: exam.systems ? (exam.systems as Prisma.InputJsonValue) : undefined,
        physicianProfileId: ctx.physicians[exam.physician].id,
        createdAt: openedAt,
        measurements: {
          create: Object.entries(exam.measurements).map(([key, value]) => ({
            tenantId,
            key,
            value,
            recordedAt: performedAt ?? openedAt,
            recordedById: ctx.users.nurse.id,
          })),
        },
      },
      update: {},
    });
    count += 1;
  }
  console.log(`✔ ${count} examinations with measurements`);
}

export interface TestSummaryProvider {
  (protocolKey: string): Promise<Array<{ title: string; lines: string[] }>>;
}

/** Renders and stores the report PDF for every APPROVED examination (mirrors HealthReportsService.approve). */
export async function seedReports(ctx: DemoContext, summaries: TestSummaryProvider): Promise<void> {
  const { prisma, tenantId } = ctx;
  if (!ctx.storage) {
    console.log('… MinIO unavailable: approved examinations are stored without report PDFs');
    return;
  }
  const profile = await prisma.organizationProfile.findUnique({
    where: { tenantId },
    include: { addressProvince: true, addressDistrict: true },
  });
  const organization = {
    name: profile?.legalName ?? ctx.tenantName,
    authorizationNumber: profile?.authorizationNumber ?? null,
    contact: [
      profile?.addressLine,
      profile?.addressDistrict?.name,
      profile?.addressProvince?.name,
      profile?.phone,
      profile?.email,
    ]
      .filter(Boolean)
      .join(' · '),
  };
  const signatures = new Map<string, Buffer | null>();
  let count = 0;
  for (const plan of PROTOCOLS) {
    if (plan.exam?.status !== 'APPROVED') continue;
    const exam = plan.exam;
    const row = await prisma.examination.findUniqueOrThrow({
      where: { id: examinationId(plan.key) },
      include: { employee: { include: { company: true, occupation: true } } },
    });
    const physician = await prisma.physician.findUniqueOrThrow({
      where: { id: ctx.physicians[exam.physician].id },
    });
    if (!signatures.has(physician.id)) {
      let png: Buffer | null = null;
      if (physician.signatureKey) {
        // Re-render deterministically instead of downloading: same generator as seedPhysicians.
        png = await signaturePng(`${physician.firstName} ${physician.lastName}`);
      }
      signatures.set(physician.id, png);
    }
    const approvedAt = addMinutes(row.performedAt!, 90);
    const reportNo = `${approvedAt.getFullYear()}-${uid(`report:${plan.key}`).slice(0, 8).toUpperCase()}`;
    const spec = employeeSpec(plan.employee);
    const pdf = await buildReportPdf({
      organization,
      reportNo,
      examination: {
        type: row.type,
        performedAt: row.performedAt!,
        fitnessDecision: row.fitnessDecision,
        restrictions: row.restrictions,
        findings: row.findings,
        conclusion: row.conclusion,
        nextExaminationDue: row.nextExaminationDue,
        anamnesis: exam.anamnesis,
        systemsExam: exam.systems ?? {},
      },
      patient: {
        fullName: `${row.employee.firstName} ${row.employee.lastName}`,
        nationalId: spec.passport ? null : tcKimlikNo(plan.employee),
        birthDate: birthDateOf(plan.employee),
        gender: row.employee.gender,
        company: row.employee.company?.name ?? null,
        occupation: row.employee.occupation?.name ?? null,
        hireDate: row.employee.hireDate,
      },
      protocolNumber: `${plan.year}-${String(plan.sequence).padStart(6, '0')}`,
      measurements: Object.fromEntries(
        Object.entries(exam.measurements).map(([k, v]) => [k, { value: v }]),
      ),
      testSummaries: await summaries(plan.key),
      physician: {
        fullName: [physician.title, physician.firstName, physician.lastName]
          .filter(Boolean)
          .join(' '),
        specialty: physician.specialty,
        diplomaNumber: physician.diplomaNumber,
        signaturePng: signatures.get(physician.id) ?? null,
      },
      approvedAt,
    });
    const document = await createDocument(ctx, {
      key: `reports/${row.id}-${reportNo}.pdf`,
      category: 'REPORT',
      fileName: `Muayene Raporu ${reportNo} - ${row.employee.firstName} ${row.employee.lastName}.pdf`,
      mimeType: 'application/pdf',
      body: pdf,
      isMedical: true,
      employeeId: row.employeeId,
      examinationId: row.id,
      uploadedById: exam.physician === 'aksoy' ? ctx.users.radiologist.id : ctx.users.physician.id,
      createdAt: approvedAt,
    });
    await prisma.examination.update({
      where: { id: row.id },
      data: {
        approvedById:
          exam.physician === 'aksoy' ? ctx.users.radiologist.id : ctx.users.physician.id,
        approvedAt,
        reportDocumentId: document?.id ?? null,
      },
    });
    count += 1;
  }
  console.log(`✔ ${count} approved report PDFs`);
}
