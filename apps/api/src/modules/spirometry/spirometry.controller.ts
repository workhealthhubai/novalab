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
import {
  CreateSpirometryDto,
  SpirometryQueryDto,
  UpdateSpirometryDto,
} from './dto/spirometry.dtos';
import { SpirometryService } from './spirometry.service';

/** Spirometri. Every route reads or writes medical data (audited by MedicalDataGuard). */
@ApiTags('spirometry')
@ApiBearerAuth()
@MedicalData({ entityType: 'SpirometryTest' })
@Controller('spirometry')
export class SpirometryController {
  constructor(private readonly spirometry: SpirometryService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SPIROMETRY_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: SpirometryQueryDto) {
    return this.spirometry.list(tenantId, query);
  }

  @Get('patients/:id/history')
  @RequirePermissions(PERMISSIONS.SPIROMETRY_READ)
  @ApiOperation({ summary: "FEV1 / FVC trend of a patient's tests, oldest first" })
  history(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.spirometry.history(tenantId, id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SPIROMETRY_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.spirometry.get(tenantId, id);
  }

  @Get(':id/trace-url')
  @RequirePermissions(PERMISSIONS.SPIROMETRY_READ)
  traceUrl(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.spirometry.traceUrl(tenantId, actor, id, extractRequestContext(req));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SPIROMETRY_MANAGE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateSpirometryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.spirometry.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SPIROMETRY_MANAGE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateSpirometryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.spirometry.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Put(':id/trace')
  @RequirePermissions(PERMISSIONS.SPIROMETRY_MANAGE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Attach (or replace) the spirometer printout: PDF, PNG, JPEG or WebP' })
  attachTrace(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @UploadedFile() file: UploadedFileLike | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.spirometry.attachTrace(tenantId, actor, id, file, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.SPIROMETRY_MANAGE)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.spirometry.remove(tenantId, actor, id, extractRequestContext(req));
  }
}
