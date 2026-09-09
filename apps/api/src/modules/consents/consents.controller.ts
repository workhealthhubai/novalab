import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { ConsentsService } from './consents.service';
import {
  ConsentQueryDto,
  GiveConsentDto,
  PublishTemplateDto,
  TemplateQueryDto,
  WithdrawConsentDto,
} from './dto/consent.dtos';

/** KVKK İzinleri: consent text versions and patient consents. */
@ApiTags('consents')
@ApiBearerAuth()
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consents: ConsentsService) {}

  @Get('templates')
  @RequirePermissions(PERMISSIONS.CONSENTS_READ)
  listTemplates(@CurrentTenant() tenantId: string, @Query() query: TemplateQueryDto) {
    return this.consents.listTemplates(tenantId, query);
  }

  @Post('templates')
  @RequirePermissions(PERMISSIONS.CONSENTS_MANAGE)
  @ApiOperation({
    summary: 'Publish a new version of a consent text (previous version is retired)',
  })
  publishTemplate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: PublishTemplateDto,
    @Req() req: RequestWithUser,
  ) {
    return this.consents.publishTemplate(tenantId, actor, dto, extractRequestContext(req));
  }

  @Post('templates/import-defaults')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CONSENTS_MANAGE)
  @ApiOperation({ summary: 'Load the bundled starter texts for types without a version' })
  importDefaults(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ) {
    return this.consents.importDefaults(tenantId, actor, extractRequestContext(req));
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CONSENTS_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: ConsentQueryDto) {
    return this.consents.listConsents(tenantId, query);
  }

  @Get('patients/:id/summary')
  @RequirePermissions(PERMISSIONS.CONSENTS_READ)
  @ApiOperation({ summary: 'Per-type consent state of a patient against the versions in force' })
  summary(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.consents.patientSummary(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CONSENTS_MANAGE)
  give(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: GiveConsentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.consents.give(tenantId, actor, dto, extractRequestContext(req));
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CONSENTS_MANAGE)
  withdraw(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: WithdrawConsentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.consents.withdraw(tenantId, actor, id, dto, extractRequestContext(req));
  }
}
