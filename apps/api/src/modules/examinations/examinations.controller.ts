import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, CurrentUser, MedicalData, RequirePermissions } from '@/common/decorators';
import { IdParamDto } from '@/common/dto/id-param.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { CreateExaminationDto } from './dto/create-examination.dto';
import { ExaminationQueryDto } from './dto/examination-query.dto';
import { CompareQueryDto, SetMeasurementsDto, TimelineQueryDto } from './dto/measurement.dtos';
import { UpdateExaminationDto } from './dto/update-examination.dto';
import { ExaminationsService } from './examinations.service';

/**
 * Every route in this controller touches medical data; the class-level
 * @MedicalData() marker makes MedicalDataGuard audit each access.
 */
@ApiTags('examinations')
@ApiBearerAuth()
@MedicalData({ entityType: 'Examination' })
@Controller('examinations')
export class ExaminationsController {
  constructor(private readonly examinations: ExaminationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: ExaminationQueryDto) {
    return this.examinations.list(tenantId, query);
  }

  @Get('timeline')
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_READ)
  @ApiOperation({ summary: "A patient's examinations for selection (no clinical text)" })
  timeline(@CurrentTenant() tenantId: string, @Query() query: TimelineQueryDto) {
    return this.examinations.timeline(tenantId, query.employeeId);
  }

  @Get('compare')
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_READ)
  @ApiOperation({
    summary: 'Muayene Karşılaştırma: selected examinations side by side with measurements',
  })
  compare(@CurrentTenant() tenantId: string, @Query() query: CompareQueryDto) {
    return this.examinations.compare(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.examinations.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_CREATE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateExaminationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.examinations.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_UPDATE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateExaminationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.examinations.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Put(':id/measurements')
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_UPDATE)
  @ApiOperation({ summary: 'Replace the structured measurements of an examination' })
  setMeasurements(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: SetMeasurementsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.examinations.setMeasurements(tenantId, actor, id, dto, extractRequestContext(req));
  }
}
