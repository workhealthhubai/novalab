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
import { BranchesService } from './branches.service';
import { BranchQueryDto } from './dto/branch-query.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@ApiTags('branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.COMPANIES_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: BranchQueryDto) {
    return this.branches.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.COMPANIES_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.branches.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.COMPANIES_CREATE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateBranchDto,
    @Req() req: RequestWithUser,
  ) {
    return this.branches.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.COMPANIES_UPDATE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateBranchDto,
    @Req() req: RequestWithUser,
  ) {
    return this.branches.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.COMPANIES_DELETE)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.branches.remove(tenantId, actor, id, extractRequestContext(req));
  }
}
