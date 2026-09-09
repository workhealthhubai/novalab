import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditOptions {
  /** Entity type recorded for automatic entries (default: controller name without "Controller"). */
  entityType?: string;
  /** Action recorded for automatic entries (default: "<METHOD> <route path>"). */
  action?: string;
  /** Route param holding the entity id (default: "id"). */
  idParam?: string;
  /** Exclude the handler/controller from automatic audit (e.g. auth endpoints audited manually). */
  skip?: boolean;
}

/** Customises how AuditInterceptor records a mutating endpoint. */
export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_KEY, options);

/** Excludes a handler/controller from automatic auditing. */
export const SkipAudit = () => SetMetadata(AUDIT_KEY, { skip: true } satisfies AuditOptions);
