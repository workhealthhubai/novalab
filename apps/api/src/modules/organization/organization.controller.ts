import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
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
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { MAX_LOGO_BYTES } from './organization-logo';
import { OrganizationService, type UploadedLogoLike } from './organization.service';

/** Kurum Bilgileri. Readable by every signed-in user (report headers); editable with system.manage. */
@ApiTags('organization')
@ApiBearerAuth()
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organization: OrganizationService) {}

  @Get()
  get(@CurrentTenant() tenantId: string) {
    return this.organization.get(tenantId);
  }

  @Put()
  @RequirePermissions(PERMISSIONS.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'Update the organization profile (empty strings clear a field)' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateOrganizationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.organization.update(actor, dto, extractRequestContext(req));
  }

  @Put('logo')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.SYSTEM_MANAGE)
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: MAX_LOGO_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['logo'],
      properties: { logo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Store or replace the logo (normalised to PNG ≤ 600px)' })
  setLogo(
    @CurrentUser() actor: AuthenticatedUser,
    @UploadedFile() logo: UploadedLogoLike | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.organization.setLogo(actor, logo, extractRequestContext(req));
  }

  @Get('logo')
  @ApiOperation({ summary: 'Stream the logo (PNG); 404 when none is stored' })
  async getLogo(@CurrentTenant() tenantId: string, @Res({ passthrough: true }) res: Response) {
    const { stream, updatedAt } = await this.organization.getLogo(tenantId);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=300');
    if (updatedAt) res.setHeader('Last-Modified', updatedAt.toUTCString());
    return new StreamableFile(stream);
  }

  @Delete('logo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.SYSTEM_MANAGE)
  removeLogo(@CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithUser) {
    return this.organization.removeLogo(actor, extractRequestContext(req));
  }
}
