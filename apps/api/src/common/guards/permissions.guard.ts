import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@osgb/shared-types';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_MODE_KEY,
  type PermissionsMode,
} from '../decorators/require-permissions.decorator';
import type { RequestWithUser } from '../interfaces/request-with-user.interface';

/**
 * Permission-based authorization. Runs after JwtAuthGuard.
 * Handlers without @RequirePermissions()/@RequireAnyPermission() only need authentication.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const mode =
      this.reflector.getAllAndOverride<PermissionsMode | undefined>(PERMISSIONS_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'all';

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      // Public route combined with permissions is a programming error; fail closed.
      throw new ForbiddenException('Authentication required');
    }

    const granted = new Set(user.permissions);
    const satisfied =
      mode === 'any' ? required.some((p) => granted.has(p)) : required.every((p) => granted.has(p));

    if (!satisfied) {
      const missing = required.filter((p) => !granted.has(p));
      throw new ForbiddenException({
        message: 'Insufficient permissions',
        errorCode: 'FORBIDDEN',
        details: { required, mode, missing },
      });
    }
    return true;
  }
}
