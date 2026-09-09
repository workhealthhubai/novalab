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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, CurrentUser, RequirePermissions } from '@/common/decorators';
import { IdParamDto } from '@/common/dto/id-param.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { CreateOccupationDto } from './dto/create-occupation.dto';
import { OccupationQueryDto } from './dto/occupation-query.dto';
import { UpdateOccupationDto } from './dto/update-occupation.dto';
import { OccupationsService } from './occupations.service';

@ApiTags('occupations')
@ApiBearerAuth()
@Controller('occupations')
export class OccupationsController {
  constructor(private readonly occupations: OccupationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.OCCUPATIONS_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: OccupationQueryDto) {
    return this.occupations.list(tenantId, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.OCCUPATIONS_MANAGE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateOccupationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.occupations.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Post('import-defaults')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.OCCUPATIONS_MANAGE)
  @ApiOperation({
    summary: 'Insert the bundled starter list (ISCO-08 based), skipping existing names/codes',
  })
  importDefaults(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ) {
    return this.occupations.importDefaults(tenantId, actor, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.OCCUPATIONS_MANAGE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateOccupationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.occupations.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.OCCUPATIONS_MANAGE)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.occupations.remove(tenantId, actor, id, extractRequestContext(req));
  }
}
