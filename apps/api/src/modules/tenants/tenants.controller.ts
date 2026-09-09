import { Body, Controller, Get, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, CurrentUser, RequirePermissions } from '@/common/decorators';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get('current')
  current(@CurrentTenant() tenantId: string) {
    return this.tenants.getCurrent(tenantId);
  }

  @Patch('current')
  @RequirePermissions(PERMISSIONS.SYSTEM_MANAGE)
  updateCurrent(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateTenantDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tenants.updateCurrent(actor, dto, extractRequestContext(req));
  }

  @Get()
  @RequirePermissions(PERMISSIONS.SYSTEM_MANAGE)
  list(@Query() query: PaginationQueryDto) {
    return this.tenants.list(query.page, query.pageSize);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SYSTEM_MANAGE)
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateTenantDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tenants.create(actor, dto, extractRequestContext(req));
  }
}
