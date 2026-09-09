import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { JOBS, QUEUES } from '../queue.constants';

export interface ProcessUploadedDocumentJobData {
  tenantId: string;
  documentId: string;
}

@Processor(QUEUES.DOCUMENTS, { concurrency: 2 })
export class DocumentsProcessor extends WorkerHost {
  constructor(private readonly logger: PinoLogger) {
    super();
    this.logger.setContext(DocumentsProcessor.name);
  }

  override async process(job: Job<ProcessUploadedDocumentJobData>): Promise<void> {
    if (job.name !== JOBS.PROCESS_UPLOADED_DOCUMENT) {
      this.logger.warn({ jobId: job.id, name: job.name }, 'Unknown job in documents queue');
      return;
    }
    // TODO(business-logic): virus scan, OCR, thumbnail generation, checksum verification.
    this.logger.info(
      { jobId: job.id, tenantId: job.data.tenantId, documentId: job.data.documentId },
      'Document post-processing (placeholder)',
    );
  }
}
