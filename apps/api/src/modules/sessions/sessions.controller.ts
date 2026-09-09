import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, CurrentUser, RequirePermissions } from '@/common/decorators';
import { IdParamDto } from '@/common/dto/id-param.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { SessionsService } from './sessions.service';

/** Aktif Kullanıcılar: who is signed in right now, and the ability to sign them out. */
@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Live sessions of the tenant (token hashes never returned)' })
  list(@CurrentTenant() tenantId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.sessions.listActive(tenantId, actor);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  @ApiOperation({ summary: 'Sign a user out everywhere' })
  revokeAll(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.sessions.revokeAllForUser(tenantId, actor, id, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  @ApiOperation({ summary: 'Sign out one session' })
  revoke(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.sessions.revoke(tenantId, actor, id, extractRequestContext(req));
  }
}
