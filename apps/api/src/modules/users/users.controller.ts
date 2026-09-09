import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, CurrentUser, RequirePermissions, SkipAudit } from '@/common/decorators';
import { IdParamDto } from '@/common/dto/id-param.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: UserQueryDto) {
    return this.users.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.users.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_CREATE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateUserDto,
    @Req() req: RequestWithUser,
  ) {
    return this.users.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateUserDto,
    @Req() req: RequestWithUser,
  ) {
    return this.users.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Put(':id/password')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  @SkipAudit()
  @ApiOperation({ summary: 'Set a new (temporary) password and revoke all sessions of the user' })
  setPassword(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: SetPasswordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.users.setPassword(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Put(':id/roles')
  @RequirePermissions(PERMISSIONS.USERS_UPDATE, PERMISSIONS.ROLES_READ)
  assignRoles(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: AssignRolesDto,
    @Req() req: RequestWithUser,
  ) {
    return this.users.assignRoles(tenantId, actor, id, dto, extractRequestContext(req));
  }
}
