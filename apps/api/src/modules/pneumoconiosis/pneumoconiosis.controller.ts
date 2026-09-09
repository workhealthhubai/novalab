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
import { CreateReadingDto, ReadingQueryDto, UpdateReadingDto } from './dto/pneumoconiosis.dtos';
import { PneumoconiosisService } from './pneumoconiosis.service';

/** Pnömokonyoz (ILO readings). Every route reads or writes medical data. */
@ApiTags('pneumoconiosis')
@ApiBearerAuth()
@MedicalData({ entityType: 'PneumoconiosisReading' })
@Controller('pneumoconiosis')
export class PneumoconiosisController {
  constructor(private readonly readings: PneumoconiosisService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PNEUMOCONIOSIS_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: ReadingQueryDto) {
    return this.readings.list(tenantId, query);
  }

  @Get('patients/:id/history')
  @RequirePermissions(PERMISSIONS.PNEUMOCONIOSIS_READ)
  @ApiOperation({ summary: "Profusion / result timeline of a patient's readings, oldest first" })
  history(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.readings.history(tenantId, id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PNEUMOCONIOSIS_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.readings.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PNEUMOCONIOSIS_MANAGE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateReadingDto,
    @Req() req: RequestWithUser,
  ) {
    return this.readings.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PNEUMOCONIOSIS_MANAGE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateReadingDto,
    @Req() req: RequestWithUser,
  ) {
    return this.readings.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.PNEUMOCONIOSIS_MANAGE)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.readings.remove(tenantId, actor, id, extractRequestContext(req));
  }
}
