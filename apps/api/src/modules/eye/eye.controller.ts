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
import { CurrentTenant, CurrentUser, MedicalData, RequirePermissions } from '@/common/decorators';
import { IdParamDto } from '@/common/dto/id-param.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { CreateEyeDto, EyeQueryDto, UpdateEyeDto } from './dto/eye.dtos';
import { EyeService } from './eye.service';

/** Göz muayenesi. Every route reads or writes medical data (audited by MedicalDataGuard). */
@ApiTags('eye')
@ApiBearerAuth()
@MedicalData({ entityType: 'EyeExamination' })
@Controller('eye')
export class EyeController {
  constructor(private readonly eye: EyeService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EYE_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: EyeQueryDto) {
    return this.eye.list(tenantId, query);
  }

  @Get('patients/:id/history')
  @RequirePermissions(PERMISSIONS.EYE_READ)
  @ApiOperation({ summary: "Acuity trend of a patient's examinations, oldest first" })
  history(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.eye.history(tenantId, id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EYE_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.eye.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EYE_MANAGE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateEyeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.eye.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.EYE_MANAGE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateEyeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.eye.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.EYE_MANAGE)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.eye.remove(tenantId, actor, id, extractRequestContext(req));
  }
}
