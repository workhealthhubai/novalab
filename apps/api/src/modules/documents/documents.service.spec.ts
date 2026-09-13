import { ForbiddenException } from '@nestjs/common';
import { PERMISSIONS } from '@osgb/shared-types';
import type { AuthenticatedUser } from '@/common/interfaces';
import type { QueueService } from '@/infrastructure/queue/queue.service';
import type { StorageService } from '@/infrastructure/storage/storage.service';
import type { AuditService } from '@/modules/audit/audit.service';
import type { DocumentsRepository } from './documents.repository';
import { DocumentsService, type UploadedFileLike } from './documents.service';

const file: UploadedFileLike = {
  originalname: 'trace.pdf',
  mimetype: 'application/pdf',
  size: 10,
  buffer: Buffer.from('0123456789'),
};

const actor = {
  id: 'user-1',
  tenantId: 'tenant-1',
  permissions: [PERMISSIONS.DOCUMENTS_UPLOAD],
} as AuthenticatedUser;

describe('DocumentsService upload policy', () => {
  const documents = {
    findEmployeeContext: jest.fn(),
    companyExists: jest.fn(),
    findExaminationContext: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<DocumentsRepository>;
  const storage = { upload: jest.fn() } as unknown as jest.Mocked<StorageService>;
  const queue = { enqueueDocumentProcessing: jest.fn() } as unknown as jest.Mocked<QueueService>;
  const audit = { log: jest.fn() } as unknown as jest.Mocked<AuditService>;
  const service = new DocumentsService(documents, storage, queue, audit);

  beforeEach(() => {
    jest.clearAllMocks();
    documents.companyExists.mockResolvedValue(true);
  });

  it('rejects a forced-medical upload before storing it when the actor lacks medical access', async () => {
    documents.findExaminationContext.mockResolvedValue({
      id: 'exam-1',
      employeeId: 'employee-1',
      employee: { tenantId: 'tenant-1', companyId: 'company-1', deletedAt: null },
    });

    await expect(
      service.upload(
        'tenant-1',
        actor,
        file,
        { category: 'ATTACHMENT', examinationId: 'exam-1', isMedical: false },
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rejects an employee that does not belong to the selected examination', async () => {
    documents.findEmployeeContext.mockResolvedValue({ id: 'employee-2', companyId: 'company-1' });
    documents.findExaminationContext.mockResolvedValue({
      id: 'exam-1',
      employeeId: 'employee-1',
      employee: { tenantId: 'tenant-1', companyId: 'company-1', deletedAt: null },
    });

    await expect(
      service.upload(
        'tenant-1',
        { ...actor, permissions: [...actor.permissions, PERMISSIONS.EXAMINATIONS_READ] },
        file,
        { employeeId: 'employee-2', examinationId: 'exam-1' },
        {},
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ errorCode: 'DOCUMENT_EMPLOYEE_MISMATCH' }),
    });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rejects a cross-tenant or missing company before storing the object', async () => {
    documents.companyExists.mockResolvedValue(false);

    await expect(
      service.upload('tenant-1', actor, file, { companyId: 'other-company' }, {}),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ errorCode: 'INVALID_COMPANY' }),
    });
    expect(storage.upload).not.toHaveBeenCalled();
  });
});
