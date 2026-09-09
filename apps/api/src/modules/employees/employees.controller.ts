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
import {
  CurrentTenant,
  CurrentUser,
  RequireAnyPermission,
  RequirePermissions,
} from '@/common/decorators';
import { IdParamDto } from '@/common/dto/id-param.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { MarkIdentityVerifiedDto } from './dto/mark-identity-verified.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { MAX_PHOTO_BYTES } from './employee-photo';
import { EmployeesService, type UploadedPhotoLike } from './employees.service';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EMPLOYEES_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: EmployeeQueryDto) {
    return this.employees.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.employees.get(tenantId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EMPLOYEES_CREATE)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateEmployeeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employees.create(tenantId, actor, dto, extractRequestContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_UPDATE)
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employees.update(tenantId, actor, id, dto, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.EMPLOYEES_DELETE)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employees.remove(tenantId, actor, id, extractRequestContext(req));
  }

  @Put(':id/photo')
  @HttpCode(HttpStatus.OK)
  @RequireAnyPermission(PERMISSIONS.EMPLOYEES_CREATE, PERMISSIONS.EMPLOYEES_UPDATE)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['photo'],
      properties: { photo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: "Store or replace the patient's portrait (normalised to JPEG ≤ 800px)" })
  setPhoto(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @UploadedFile() photo: UploadedPhotoLike | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.employees.setPhoto(tenantId, actor, id, photo, extractRequestContext(req));
  }

  @Get(':id/photo')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: "Stream the patient's portrait (JPEG); 404 when none is stored" })
  async getPhoto(
    @CurrentTenant() tenantId: string,
    @Param() { id }: IdParamDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, updatedAt } = await this.employees.getPhoto(tenantId, id);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, no-store');
    if (updatedAt) res.setHeader('Last-Modified', updatedAt.toUTCString());
    return new StreamableFile(stream);
  }

  @Delete(':id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({ summary: "Remove the patient's portrait" })
  removePhoto(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employees.removePhoto(tenantId, actor, id, extractRequestContext(req));
  }

  @Post(':id/verify-identity')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({
    summary:
      'Verify TC Kimlik No + name + birth year against the official source and store the result',
  })
  verifyIdentity(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employees.verifyIdentity(tenantId, actor, id, extractRequestContext(req));
  }

  @Post(':id/mark-identity-verified')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({ summary: 'Record a manual identity check against the physical document' })
  markIdentityVerified(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: MarkIdentityVerifiedDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employees.markIdentityVerified(
      tenantId,
      actor,
      id,
      dto,
      extractRequestContext(req),
    );
  }

  @Post(':id/reports')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions(PERMISSIONS.REPORTS_EXPORT)
  @ApiOperation({ summary: 'Queue an employee report (background job example)' })
  requestReport(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employees.requestReport(tenantId, actor, id, extractRequestContext(req));
  }
}
