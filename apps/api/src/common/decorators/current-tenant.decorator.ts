import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { RequestWithUser } from '../interfaces/request-with-user.interface';

/**
 * Injects the active tenant id, resolved from the authenticated session.
 * Never read tenantId from the request body/query - clients are not trusted.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('No active tenant in session');
    }
    return tenantId;
  },
);
