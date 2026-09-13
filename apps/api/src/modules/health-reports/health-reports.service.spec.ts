import { BadRequestException } from '@nestjs/common';
import { HealthReportsService } from './health-reports.service';
import type { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { ProtocolsService } from '@/modules/protocols/protocols.service';
import type { DocumentsService } from '@/modules/documents/documents.service';
import type { StorageService } from '@/infrastructure/storage/storage.service';
import type { AuditService } from '@/modules/audit/audit.service';
import type { PinoLogger } from 'nestjs-pino';
import type { AuthenticatedUser } from '@/common/interfaces';

const actor: AuthenticatedUser = {
  id: 'doctor',
  tenantId: 'tenant',
  email: 'doctor@example.test',
  firstName: 'Test',
  lastName: 'Doctor',
  status: 'ACTIVE',
  roles: [],
  permissions: [],
};
function fixture() {
  const row = {
    id: 'exam',
    tenantId: 'tenant',
    employeeId: 'patient',
    protocolId: 'visit',
    version: 1,
    status: 'IN_PROGRESS',
    type: 'PERIODIC',
    performedAt: new Date('2026-01-01'),
    approvedAt: null,
    fitnessDecision: 'FIT',
    physicianProfileId: 'physician',
    restrictions: null,
    conclusion: null,
    findings: null,
    nextExaminationDue: null,
    anamnesis: {},
    systemsExam: {},
    measurements: [],
    employee: {
      id: 'patient',
      firstName: 'Sentetik',
      lastName: 'Hasta',
      nationalId: null,
      birthDate: null,
      gender: null,
      company: null,
      occupation: null,
      hireDate: null,
    },
    protocol: {
      id: 'visit',
      status: 'IN_PROGRESS',
      protocolNumber: 'TEST-1',
      deletedAt: null,
      items: [{ id: 'lab-item', type: 'LAB', status: 'DONE', note: null }],
    },
  };
  const lab = {
    id: 'lab',
    date: new Date('2026-01-01'),
    fields: { laboratory: 'Test Lab', sampleNumber: 'S1', content: 'Hb: 14 g/dL (12–16)' },
  };
  const db = {
    examination: {
      findFirst: jest.fn().mockImplementation(async () => structuredClone(row)),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    operationRecord: { findFirst: jest.fn().mockResolvedValue(lab) },
    audiometryTest: { findFirst: jest.fn().mockResolvedValue(null) },
    spirometryTest: { findFirst: jest.fn().mockResolvedValue(null) },
    eyeExamination: { findFirst: jest.fn().mockResolvedValue(null) },
    ecgRecord: { findFirst: jest.fn().mockResolvedValue(null) },
    radiologyRequest: { findFirst: jest.fn().mockResolvedValue(null) },
    pneumoconiosisReading: { findFirst: jest.fn().mockResolvedValue(null) },
    physician: {
      findFirst: jest
        .fn()
        .mockResolvedValue({
          id: 'physician',
          userId: 'doctor',
          status: 'ACTIVE',
          firstName: 'Test',
          lastName: 'Doctor',
          title: null,
          specialty: null,
          diplomaNumber: null,
          signatureKey: null,
          user: { status: 'ACTIVE', deletedAt: null },
        }),
    },
    tenant: { findFirst: jest.fn().mockResolvedValue({ name: 'Test OSGB' }) },
    organizationProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    document: { create: jest.fn().mockResolvedValue({ id: 'document' }) },
    $transaction: jest.fn(),
  };
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  const storage = {
    upload: jest.fn().mockResolvedValue({ key: 'test-report.pdf', bucket: 'test' }),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const protocols = { get: jest.fn().mockResolvedValue({ items: [] }) };
  const service = new HealthReportsService(
    db as unknown as PrismaService,
    protocols as unknown as ProtocolsService,
    {} as DocumentsService,
    storage as unknown as StorageService,
    { log: jest.fn() } as unknown as AuditService,
    { setContext: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as PinoLogger,
  );
  return { service, db, storage, row };
}

describe('health report source and approval integration', () => {
  it('returns the linked laboratory content in the same summary used for PDF generation', async () => {
    const { service, db } = fixture();
    const view = await service.get('tenant', 'exam');
    expect(view.tests).toEqual([
      expect.objectContaining({
        module: 'lab',
        id: 'lab',
        lines: expect.arrayContaining(['Hb: 14 g/dL (12–16)']),
      }),
    ]);
    expect(view.blockers).toEqual([]);
    expect(db.operationRecord.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          protocolId: 'visit',
          status: 'Tamamlandı',
          protocol: { tenantId: 'tenant', employeeId: 'patient', deletedAt: null },
        }),
      }),
    );
  });
  it('rejects approval of manually completed LAB without a result, before writing a PDF', async () => {
    const { service, db, storage } = fixture();
    db.operationRecord.findFirst.mockResolvedValue(null);
    await expect(service.approve('tenant', actor, 'exam', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storage.upload).not.toHaveBeenCalled();
    expect(db.examination.updateMany).not.toHaveBeenCalled();
  });
  it('rejects pending tests even if a result exists', async () => {
    const { service, row, storage } = fixture();
    row.protocol.items[0]!.status = 'PENDING';
    await expect(service.approve('tenant', actor, 'exam', {})).rejects.toMatchObject({
      response: { details: { blockers: ['PENDING_TEST_LAB'] } },
    });
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it('creates a PDF and commits approval only after rechecking the clinical snapshot', async () => {
    const { service, db, storage } = fixture();
    await service.approve('tenant', actor, 'exam', {});
    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'application/pdf', body: expect.any(Buffer) }),
    );
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(db.examination.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ version: 1 }),
        data: expect.objectContaining({ status: 'APPROVED', reportDocumentId: 'document' }),
      }),
    );
    expect(storage.delete).not.toHaveBeenCalled();
  });
  it('removes the orphan PDF and refuses approval if the visit changes during rendering/upload', async () => {
    const { service, db, storage, row } = fixture();
    storage.upload.mockImplementation(async () => {
      row.protocol.items[0]!.status = 'PENDING';
      return { key: 'test-report.pdf', bucket: 'test' };
    });
    await expect(service.approve('tenant', actor, 'exam', {})).rejects.toMatchObject({
      response: { errorCode: 'REPORT_RESULTS_CHANGED' },
    });
    expect(db.document.create).not.toHaveBeenCalled();
    expect(db.examination.updateMany).not.toHaveBeenCalled();
    expect(storage.delete).toHaveBeenCalledWith('test-report.pdf', 'test');
  });
});
