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
import { CurrentTenant, CurrentUser, RequirePermissions } from '@/common/decorators';
import { IdParamDto } from '@/common/dto/id-param.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { CreateProtocolDto } from './dto/create-protocol.dto';
import {
  AddProtocolItemsDto,
  CloseProtocolDto,
  ProtocolItemParamDto,
  UpdateProtocolItemDto,
} from './dto/protocol-item.dto';
import { ProtocolQueryDto, WorklistQueryDto } from './dto/protocol-query.dto';
import { UpdateProtocolDto } from './dto/update-protocol.dto';
import { ProtocolsService } from './protocols.service';

/**
 * Visit protocols. Items are orders/checklist entries, not medical findings, so the controller
 * is not marked as medical data; the doctor modules that attach results are.
 */
@ApiTags('protocols')
@ApiBearerAuth()
@Controller('protocols')
export class ProtocolsController {
  constructor(private readonly protocols: ProtocolsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PROTOCOLS_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: ProtocolQueryDto) {
    return this.protocols.list(tenantId, query);
  }

  @Get('worklist')
  @RequirePermissions(PERMISSIONS.PROTOCOLS_READ)
  @ApiOperation({
    summary: 'Open protocols with a pending item of the given type (doctor module worklist)',
  })
  worklist(@CurrentTenant() tenantId: string, @Query() query: WorklistQueryDto) {
    return this.protocols.worklist(tenantId, query.itemType, query.limit);
  }

  @Get(':id/records')
  @RequirePermissions(PERMISSIONS.PROTOCOLS_READ)
  @ApiOperation({ summary: 'Doctor-module records linked to the protocol, per item type' })
  records(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.protocols.records(tenantId, id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PROTOCOLS_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.protocols.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROTOCOLS_CREATE)
  @ApiOperation({ summary: 'Open a protocol (visit) for a patient with its ordered tests' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateProtocolDto,
    @Req() req: RequestWithUser,
  ) {
    return this.protocols.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PROTOCOLS_UPDATE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateProtocolDto,
    @Req() req: RequestWithUser,
  ) {
    return this.protocols.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.PROTOCOLS_UPDATE)
  @ApiOperation({ summary: 'Add tests to an open protocol' })
  addItems(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: AddProtocolItemsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.protocols.addItems(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Patch(':id/items/:itemId')
  @RequirePermissions(PERMISSIONS.PROTOCOLS_UPDATE)
  @ApiOperation({ summary: 'Mark a test done/cancelled/pending or edit its note' })
  updateItem(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id, itemId }: ProtocolItemParamDto,
    @Body() dto: UpdateProtocolItemDto,
    @Req() req: RequestWithUser,
  ) {
    return this.protocols.updateItem(tenantId, actor, id, itemId, dto, extractRequestContext(req));
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.PROTOCOLS_CLOSE)
  @ApiOperation({
    summary: 'Complete the protocol (refuses while items are pending unless cancelPending)',
  })
  close(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: CloseProtocolDto,
    @Req() req: RequestWithUser,
  ) {
    return this.protocols.close(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.PROTOCOLS_CLOSE)
  cancel(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.protocols.cancel(tenantId, actor, id, extractRequestContext(req));
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.PROTOCOLS_CLOSE)
  reopen(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.protocols.reopen(tenantId, actor, id, extractRequestContext(req));
  }
}
