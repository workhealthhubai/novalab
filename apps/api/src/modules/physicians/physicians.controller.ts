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
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import type { Response } from 'express';
import { CurrentTenant, CurrentUser, RequirePermissions } from '@/common/decorators';
import { IdParamDto } from '@/common/dto/id-param.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { CreatePhysicianDto } from './dto/create-physician.dto';
import { PhysicianQueryDto } from './dto/physician-query.dto';
import { UpdatePhysicianDto } from './dto/update-physician.dto';
import { MAX_SIGNATURE_BYTES } from './physician-signature';
import { PhysiciansService, type UploadedSignatureLike } from './physicians.service';

@ApiTags('physicians')
@ApiBearerAuth()
@Controller('physicians')
export class PhysiciansController {
  constructor(private readonly physicians: PhysiciansService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PHYSICIANS_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: PhysicianQueryDto) {
    return this.physicians.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PHYSICIANS_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.physicians.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PHYSICIANS_MANAGE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreatePhysicianDto,
    @Req() req: RequestWithUser,
  ) {
    return this.physicians.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PHYSICIANS_MANAGE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdatePhysicianDto,
    @Req() req: RequestWithUser,
  ) {
    return this.physicians.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.PHYSICIANS_MANAGE)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.physicians.remove(tenantId, actor, id, extractRequestContext(req));
  }

  @Put(':id/signature')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.PHYSICIANS_MANAGE)
  @UseInterceptors(
    FileInterceptor('signature', { limits: { fileSize: MAX_SIGNATURE_BYTES, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['signature'],
      properties: { signature: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Store or replace the signature image (trimmed, PNG ≤ 800×300)' })
  setSignature(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @UploadedFile() signature: UploadedSignatureLike | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.physicians.setSignature(tenantId, actor, id, signature, extractRequestContext(req));
  }

  @Get(':id/signature')
  @RequirePermissions(PERMISSIONS.PHYSICIANS_READ)
  async getSignature(
    @CurrentTenant() tenantId: string,
    @Param() { id }: IdParamDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, updatedAt } = await this.physicians.getSignature(tenantId, id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, no-store');
    if (updatedAt) res.setHeader('Last-Modified', updatedAt.toUTCString());
    return new StreamableFile(stream);
  }

  @Delete(':id/signature')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.PHYSICIANS_MANAGE)
  removeSignature(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.physicians.removeSignature(tenantId, actor, id, extractRequestContext(req));
  }
}
