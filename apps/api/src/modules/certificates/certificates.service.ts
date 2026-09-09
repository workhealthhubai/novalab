import { Injectable, NotImplementedException } from '@nestjs/common';

/**
 * Placeholder for certificates (training certificates, fitness reports as PDF).
 * TODO(business-logic): Certificate model referencing Document (MinIO), issue/revoke flows,
 * verification codes/QR, expiry reminders via the notifications queue.
 */
@Injectable()
export class CertificatesService {
  list(_tenantId: string): never {
    throw new NotImplementedException({
      message: 'Certificates are not implemented yet',
      errorCode: 'NOT_IMPLEMENTED',
    });
  }
}
