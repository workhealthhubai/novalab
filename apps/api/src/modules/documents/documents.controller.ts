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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, CurrentUser, RequirePermissions } from '@/common/decorators';
import { IdParamDto } from '@/common/dto/id-param.dto';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { DocumentsService, MAX_UPLOAD_BYTES, type UploadedFileLike } from './documents.service';
import { DocumentQueryDto } from './dto/document-query.dto';
import { UpdateDocumentExpiryDto } from './dto/update-document-expiry.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  list(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: DocumentQueryDto,
  ) {
    return this.documents.list(tenantId, actor, query);
  }

  @Patch(':id/expiry')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_UPLOAD)
  updateExpiry(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateDocumentExpiryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.documents.updateExpiry(
      tenantId,
      actor,
      id,
      dto.expiresAt,
      extractRequestContext(req),
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  get(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
  ) {
    return this.documents.get(tenantId, actor, id);
  }

  @Get(':id/download-url')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Short-lived presigned download URL' })
  downloadUrl(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.documents.getDownloadUrl(tenantId, actor, id, extractRequestContext(req));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.DOCUMENTS_UPLOAD)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        category: {
          type: 'string',
          enum: ['REPORT', 'CERTIFICATE', 'SCANNED_DOCUMENT', 'ATTACHMENT', 'OTHER'],
        },
        isMedical: { type: 'boolean' },
        employeeId: { type: 'string', format: 'uuid' },
        companyId: { type: 'string', format: 'uuid' },
        examinationId: { type: 'string', format: 'uuid' },
      },
    },
  })
  upload(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @UploadedFile() file: UploadedFileLike | undefined,
    @Body() dto: UploadDocumentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.documents.upload(tenantId, actor, file, dto, extractRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.DOCUMENTS_DELETE)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.documents.remove(tenantId, actor, id, extractRequestContext(req));
  }
}
