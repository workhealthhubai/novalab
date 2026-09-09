import {
  Body,
  Controller,
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
import { CreateReportDto, ReportQueryDto, UpdateReportDto } from './dto/health-report.dtos';
import { HealthReportsService } from './health-reports.service';

/** Sağlık Raporları: examinations as Ek-2 reports. Every route touches medical data. */
@ApiTags('health-reports')
@ApiBearerAuth()
@MedicalData({ entityType: 'Examination' })
@Controller('health-reports')
export class HealthReportsController {
  constructor(private readonly reports: HealthReportsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.list(tenantId, query);
  }

  @Get('patients/:id/summary')
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_READ)
  @ApiOperation({
    summary: 'Latest record per doctor module and last report decision for a patient',
  })
  patientSummary(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.reports.patientSummary(tenantId, id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_READ)
  @ApiOperation({
    summary: 'Report content with measurements, linked test summaries and approval blockers',
  })
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.reports.get(tenantId, id);
  }

  @Get(':id/pdf-url')
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_READ)
  pdfUrl(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.reports.pdfUrl(tenantId, actor, id, extractRequestContext(req));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_CREATE)
  @ApiOperation({ summary: 'Open (create or return) the report of a protocol' })
  createForProtocol(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateReportDto,
    @Req() req: RequestWithUser,
  ) {
    return this.reports.createForProtocol(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_UPDATE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateReportDto,
    @Req() req: RequestWithUser,
  ) {
    return this.reports.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_APPROVE)
  @ApiOperation({
    summary: 'Physician sign-off: renders and stores the signed PDF, locks the report',
  })
  approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.reports.approve(tenantId, actor, id, extractRequestContext(req));
  }
}
