import { Processor, WorkerHost } from '@nestjs/bullmq';
import { createHash } from 'node:crypto';
import type { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import sharp from 'sharp';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { JOBS, QUEUES } from '../queue.constants';

export interface ProcessUploadedDocumentJobData {
  tenantId: string;
  documentId: string;
}

@Processor(QUEUES.DOCUMENTS, { concurrency: 2 })
export class DocumentsProcessor extends WorkerHost {
  constructor(
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    super();
    this.logger.setContext(DocumentsProcessor.name);
  }

  override async process(job: Job<ProcessUploadedDocumentJobData>): Promise<void> {
    if (job.name !== JOBS.PROCESS_UPLOADED_DOCUMENT) {
      this.logger.warn({ jobId: job.id, name: job.name }, 'Unknown job in documents queue');
      return;
    }
    const document = await this.prisma.document.findFirst({
      where: { id: job.data.documentId, tenantId: job.data.tenantId, deletedAt: null },
    });
    if (!document) {
      this.logger.warn(
        { jobId: job.id, documentId: job.data.documentId },
        'Document no longer exists',
      );
      return;
    }
    const body = await this.storage.downloadBuffer(document.objectKey, document.bucket);
    const checksum = createHash('sha256').update(body).digest('hex');
    if (document.checksum && checksum !== document.checksum) {
      throw new Error(`Document checksum mismatch for ${document.id}`);
    }
    if (document.mimeType.startsWith('image/')) {
      const thumbnail = await sharp(body)
        .rotate()
        .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer();
      const thumbnailKey = `${document.tenantId}/thumbnails/${document.id}.jpg`;
      await this.storage.upload({
        key: thumbnailKey,
        body: thumbnail,
        contentType: 'image/jpeg',
        size: thumbnail.length,
      });
      await this.prisma.document.update({ where: { id: document.id }, data: { thumbnailKey } });
    }
    this.logger.info(
      { jobId: job.id, tenantId: job.data.tenantId, documentId: job.data.documentId },
      'Document checksum verified and post-processing completed',
    );
  }
}
