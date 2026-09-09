import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, CurrentUser, RequirePermissions } from '@/common/decorators';
import { IdParamDto } from '@/common/dto/id-param.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { CreateWorkplaceDto } from './dto/create-workplace.dto';
import { UpdateWorkplaceDto } from './dto/update-workplace.dto';
import { WorkplaceQueryDto } from './dto/workplace-query.dto';
import { WorkplacesService } from './workplaces.service';

@ApiTags('workplaces')
@ApiBearerAuth()
@Controller('workplaces')
export class WorkplacesController {
  constructor(private readonly workplaces: WorkplacesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.WORKPLACES_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: WorkplaceQueryDto) {
    return this.workplaces.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKPLACES_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.workplaces.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.WORKPLACES_MANAGE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateWorkplaceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workplaces.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKPLACES_MANAGE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateWorkplaceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workplaces.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.WORKPLACES_MANAGE)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workplaces.remove(tenantId, actor, id, extractRequestContext(req));
  }
}
