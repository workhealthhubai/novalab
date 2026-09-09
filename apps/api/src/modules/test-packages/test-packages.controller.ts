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
import { CreateTestPackageDto } from './dto/create-test-package.dto';
import { TestPackageQueryDto } from './dto/test-package-query.dto';
import { UpdateTestPackageDto } from './dto/update-test-package.dto';
import { TestPackagesService } from './test-packages.service';

/** Tetkik Paketleri: bundles of catalogue tests; share the catalogue permissions. */
@ApiTags('test-packages')
@ApiBearerAuth()
@Controller('test-packages')
export class TestPackagesController {
  constructor(private readonly packages: TestPackagesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.TESTS_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: TestPackageQueryDto) {
    return this.packages.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.TESTS_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.packages.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.TESTS_MANAGE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateTestPackageDto,
    @Req() req: RequestWithUser,
  ) {
    return this.packages.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.TESTS_MANAGE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateTestPackageDto,
    @Req() req: RequestWithUser,
  ) {
    return this.packages.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.TESTS_MANAGE)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.packages.remove(tenantId, actor, id, extractRequestContext(req));
  }
}
