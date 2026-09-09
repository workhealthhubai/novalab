import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import type { RequestWithUser } from '../interfaces/request-with-user.interface';

/**
 * Injects the authenticated user (or one of its properties).
 * @example handler(@CurrentUser() user: AuthenticatedUser)
 * @example handler(@CurrentUser('id') userId: string)
 */
export const CurrentUser = createParamDecorator(
  (property: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) return undefined;
    return property ? user[property] : user;
  },
);
