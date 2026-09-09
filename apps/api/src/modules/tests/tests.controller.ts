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
import { CreateTestDto } from './dto/create-test.dto';
import { TestQueryDto } from './dto/test-query.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { TestsService } from './tests.service';

/** Tetkik Tanımları: catalogue of tests/services with list prices. */
@ApiTags('tests')
@ApiBearerAuth()
@Controller('tests')
export class TestsController {
  constructor(private readonly tests: TestsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.TESTS_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: TestQueryDto) {
    return this.tests.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.TESTS_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.tests.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.TESTS_MANAGE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateTestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tests.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.TESTS_MANAGE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateTestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tests.update(tenantId, actor, id, dto, extractRequestContext(req));
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
    return this.tests.remove(tenantId, actor, id, extractRequestContext(req));
  }
}
