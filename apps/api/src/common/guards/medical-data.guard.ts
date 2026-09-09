import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditAction, MEDICAL_PERMISSIONS } from '@osgb/shared-types';
import { AuditService } from '@/modules/audit/audit.service';
import { MEDICAL_DATA_KEY, type MedicalDataOptions } from '../decorators/medical-data.decorator';
import type { RequestWithUser } from '../interfaces/request-with-user.interface';
import { extractRequestContext } from '../interfaces/request-with-user.interface';

/**
 * Extra gate for handlers marked with @MedicalData().
 *
 * Today it (1) requires at least one medical permission as defense in depth and
 * (2) writes a MEDICAL_DATA_ACCESS audit entry. It is the single place to add
 * stricter rules later (e.g. physician-only roles, purpose-of-use, break-glass).
 */
@Injectable()
export class MedicalDataGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<MedicalDataOptions | undefined>(
      MEDICAL_DATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Authentication required');

    const hasMedicalPermission = user.permissions.some((p) => MEDICAL_PERMISSIONS.includes(p));
    if (!hasMedicalPermission) {
      throw new ForbiddenException({
        message: 'Access to medical data requires a medical permission',
        errorCode: 'MEDICAL_ACCESS_DENIED',
      });
    }

    const params = request.params as Record<string, string | undefined>;
    const entityId = params[options.idParam ?? 'id'];
    await this.audit.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: AuditAction.MEDICAL_DATA_ACCESS,
      entityType: options.entityType,
      entityId: entityId ?? null,
      newValue: { method: request.method, path: request.originalUrl },
      ...extractRequestContext(request),
    });
    return true;
  }
}
