import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ALL_PERMISSIONS, PERMISSIONS } from '@osgb/shared-types';
import type { AuthenticatedUser } from '@/common/interfaces';
import type { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { AuditService } from '@/modules/audit/audit.service';
import { OperationsService } from './operations.service';
import type { SaveOperationDto } from './operations.dto';
const actor: AuthenticatedUser = {
  id: 'user-a',
  tenantId: 'tenant-a',
  email: 'test@example.test',
  firstName: 'Test',
  lastName: 'User',
  status: 'ACTIVE',
  roles: [],
  permissions: [...ALL_PERMISSIONS],
};
const dto: SaveOperationDto = {
  title: 'Kan sonuçları',
  date: '2026-09-12',
  status: 'Tamamlandı',
  fields: {
    protocolId: '11111111-1111-4111-8111-111111111111',
    laboratory: 'Lab',
    sampleNumber: 'S1',
    sampleDate: '2026-09-12',
    content: 'Hemoglobin: 14 g/dL, referans: 12–16',
  },
};
describe('OperationsService', () => {
  const tx = {
    operationRecord: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
      create: jest.fn(),
    },
    protocol: { updateMany: jest.fn() },
    protocolItem: { findFirst: jest.fn(), update: jest.fn() },
    company: { findFirst: jest.fn() },
    physician: { findFirst: jest.fn() },
  };
  const prisma = { $transaction: jest.fn(), ...tx };
  const audit = { log: jest.fn() };
  const service = new OperationsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (client: typeof tx) => unknown) => fn(tx));
    tx.protocol.updateMany.mockResolvedValue({ count: 1 });
    tx.protocolItem.findFirst.mockResolvedValue({ id: 'item' });
    tx.operationRecord.findFirst.mockResolvedValue(null);
    tx.operationRecord.create.mockResolvedValue({ id: 'new' });
  });
  it('rejects missing module permission before reading records', async () => {
    await expect(
      service.save({ ...actor, permissions: [PERMISSIONS.EXAMINATIONS_READ] }, 'lab', dto),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('does not expose records from another tenant', async () => {
    await expect(
      service.save(actor, 'lab', { ...dto, version: 1 }, 'foreign-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.operationRecord.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-id', tenantId: 'tenant-a', kind: 'lab', deletedAt: null },
    });
  });
  it('completes the protocol item and persists the report in one transaction', async () => {
    await service.save(actor, 'lab', dto);
    expect(tx.protocol.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: actor.tenantId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        }),
        data: expect.objectContaining({ status: 'IN_PROGRESS' }),
      }),
    );
    expect(tx.protocolItem.update).toHaveBeenCalledWith({
      where: { id: 'item' },
      data: { status: 'DONE', completedAt: expect.any(Date) },
    });
    expect(tx.operationRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: actor.tenantId,
        createdById: actor.id,
        kind: 'lab',
      }),
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MEDICAL_DATA_ACCESS' }),
    );
  });
  it('rejects closed or foreign protocols without completing the item', async () => {
    tx.protocol.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.save(actor, 'lab', dto)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.protocolItem.update).not.toHaveBeenCalled();
    expect(tx.operationRecord.create).not.toHaveBeenCalled();
  });
  it('rejects duplicates before completing the protocol item', async () => {
    tx.operationRecord.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.save(actor, 'lab', dto)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.protocolItem.update).not.toHaveBeenCalled();
  });
  it('rejects stale versions and final reports', async () => {
    tx.operationRecord.findFirst.mockResolvedValue({
      id: 'existing',
      version: 2,
      status: 'Taslak',
    });
    await expect(
      service.save(actor, 'lab', { ...dto, version: 1 }, 'existing'),
    ).rejects.toBeInstanceOf(ConflictException);
    tx.operationRecord.findFirst.mockResolvedValue({
      id: 'existing',
      version: 2,
      status: 'Tamamlandı',
    });
    await expect(
      service.save(actor, 'lab', { ...dto, version: 2 }, 'existing'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.operationRecord.updateMany).not.toHaveBeenCalled();
  });
});
