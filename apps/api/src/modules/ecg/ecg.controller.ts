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
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, CurrentUser, MedicalData, RequirePermissions } from '@/common/decorators';
import { IdParamDto } from '@/common/dto/id-param.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { MAX_UPLOAD_BYTES, type UploadedFileLike } from '@/modules/documents/documents.service';
import { CreateEcgDto, EcgQueryDto, UpdateEcgDto } from './dto/ecg.dtos';
import { EcgService } from './ecg.service';

/** EKG. Every route reads or writes medical data (audited by MedicalDataGuard). */
@ApiTags('ecg')
@ApiBearerAuth()
@MedicalData({ entityType: 'EcgRecord' })
@Controller('ecg')
export class EcgController {
  constructor(private readonly ecg: EcgService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ECG_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: EcgQueryDto) {
    return this.ecg.list(tenantId, query);
  }

  @Get('patients/:id/history')
  @RequirePermissions(PERMISSIONS.ECG_READ)
  @ApiOperation({ summary: "Rate / QTc trend of a patient's records, oldest first" })
  history(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.ecg.history(tenantId, id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ECG_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.ecg.get(tenantId, id);
  }

  @Get(':id/trace-url')
  @RequirePermissions(PERMISSIONS.ECG_READ)
  @ApiOperation({ summary: 'Short-lived download link for the attached device printout' })
  traceUrl(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ecg.traceUrl(tenantId, actor, id, extractRequestContext(req));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ECG_MANAGE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateEcgDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ecg.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ECG_MANAGE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateEcgDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ecg.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Put(':id/trace')
  @RequirePermissions(PERMISSIONS.ECG_MANAGE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Attach (or replace) the device printout: PDF, PNG, JPEG or WebP' })
  attachTrace(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @UploadedFile() file: UploadedFileLike | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.ecg.attachTrace(tenantId, actor, id, file, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ECG_MANAGE)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ecg.remove(tenantId, actor, id, extractRequestContext(req));
  }
}
