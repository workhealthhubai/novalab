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
import { AudiometryService } from './audiometry.service';
import {
  AudiometryQueryDto,
  CreateAudiometryDto,
  UpdateAudiometryDto,
} from './dto/audiometry.dtos';

/** Odyometri. Every route reads or writes medical data (audited by MedicalDataGuard). */
@ApiTags('audiometry')
@ApiBearerAuth()
@MedicalData({ entityType: 'AudiometryTest' })
@Controller('audiometry')
export class AudiometryController {
  constructor(private readonly audiometry: AudiometryService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIOMETRY_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: AudiometryQueryDto) {
    return this.audiometry.list(tenantId, query);
  }

  @Get('patients/:id/history')
  @RequirePermissions(PERMISSIONS.AUDIOMETRY_READ)
  @ApiOperation({ summary: "PTA trend of a patient's tests, oldest first" })
  history(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.audiometry.history(tenantId, id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.AUDIOMETRY_READ)
  @ApiOperation({
    summary: 'Test with derived analysis (grades, notch, shifts vs baseline/previous)',
  })
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.audiometry.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.AUDIOMETRY_MANAGE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateAudiometryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.audiometry.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.AUDIOMETRY_MANAGE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateAudiometryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.audiometry.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.AUDIOMETRY_MANAGE)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.audiometry.remove(tenantId, actor, id, extractRequestContext(req));
  }
}
