import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, CurrentUser, MedicalData, RequirePermissions } from '@/common/decorators';
import { IdParamDto } from '@/common/dto/id-param.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import type { AppConfig } from '@/config/configuration';
import { CreateRadiologyRequestDto } from './dto/create-radiology-request.dto';
import { LinkStudyDto } from './dto/link-study.dto';
import { RadiologyQueryDto } from './dto/radiology-query.dto';
import { RadiologyReportDto } from './dto/radiology-report.dto';
import { RadiologyService } from './radiology.service';

@ApiTags('radiology')
@ApiBearerAuth()
@MedicalData({ entityType: 'RadiologyRequest' })
@Controller('radiology')
export class RadiologyController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly radiology: RadiologyService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.secureCookies = config.get('isProduction', { infer: true });
  }

  @Get('pacs/status')
  @RequirePermissions(PERMISSIONS.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'Orthanc system information (operators only)' })
  pacsStatus() {
    return this.radiology.pacsStatus();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.RADIOLOGY_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: RadiologyQueryDto) {
    return this.radiology.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.RADIOLOGY_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.radiology.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.RADIOLOGY_CREATE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateRadiologyRequestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.radiology.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id/link-study')
  @RequirePermissions(PERMISSIONS.RADIOLOGY_CREATE)
  @ApiOperation({ summary: 'Attach an Orthanc study to the request by StudyInstanceUID' })
  linkStudy(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: LinkStudyDto,
    @Req() req: RequestWithUser,
  ) {
    return this.radiology.linkStudy(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Post(':id/report')
  @RequirePermissions(PERMISSIONS.RADIOLOGY_REPORT)
  report(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: RadiologyReportDto,
    @Req() req: RequestWithUser,
  ) {
    return this.radiology.report(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Post(':id/viewer-session')
  @RequirePermissions(PERMISSIONS.RADIOLOGY_READ)
  @ApiOperation({ summary: 'Issue a short-lived DICOMweb cookie and return the OHIF URL' })
  async viewerSession(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.radiology.createViewerSession(tenantId, actor, id);
    res.cookie(session.cookie.name, session.cookie.value, {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'strict',
      path: '/dicom-web',
      maxAge: session.cookie.maxAgeSeconds * 1000,
    });
    return {
      viewerUrl: session.viewerUrl,
      previewUrl: session.previewUrl,
      expiresIn: session.cookie.maxAgeSeconds,
    };
  }

  @Get(':id/preview')
  @RequirePermissions(PERMISSIONS.RADIOLOGY_READ)
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'private, max-age=60')
  @ApiOperation({ summary: 'PNG preview of the linked study (proxied from Orthanc)' })
  async preview(
    @CurrentTenant() tenantId: string,
    @Param() { id }: IdParamDto,
  ): Promise<StreamableFile> {
    const png = await this.radiology.getPreviewImage(tenantId, id);
    return new StreamableFile(png, { type: 'image/png' });
  }
}
