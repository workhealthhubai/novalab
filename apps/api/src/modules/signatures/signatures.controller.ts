import {
  Body,
  Controller,
  Get,
  Param,
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
import { MAX_UPLOAD_BYTES, type UploadedFileLike } from '@/modules/documents/documents.service';
import { SignatureQueryDto, SignConsentDto, SignUploadDto } from './dto/signature.dtos';
import { SignaturesService } from './signatures.service';

/** Belge İmza: signature-pad signing of consent texts and uploaded PDFs. */
@ApiTags('signatures')
@ApiBearerAuth()
@Controller('signatures')
export class SignaturesController {
  constructor(private readonly signatures: SignaturesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: SignatureQueryDto) {
    return this.signatures.list(tenantId, query);
  }

  @Get('consent-forms/:id')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  @ApiOperation({
    summary: 'Consent text with organisation placeholders filled, as shown to the patient',
  })
  consentForm(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.signatures.consentFormText(tenantId, id);
  }

  @Post('consents')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_SIGN)
  @ApiOperation({
    summary: 'Sign a consent text: renders the PDF, records the consent and the signature proof',
  })
  signConsent(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: SignConsentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.signatures.signConsent(tenantId, actor, dto, extractRequestContext(req));
  }

  @Post('documents')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_SIGN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'employeeId', 'title', 'signature'],
      properties: {
        file: { type: 'string', format: 'binary' },
        employeeId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        signerName: { type: 'string' },
        signature: { type: 'string', description: 'PNG data URL' },
      },
    },
  })
  @ApiOperation({ summary: 'Stamp the signature onto an uploaded PDF and store it' })
  signUpload(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @UploadedFile() file: UploadedFileLike | undefined,
    @Body() dto: SignUploadDto,
    @Req() req: RequestWithUser,
  ) {
    return this.signatures.signUpload(tenantId, actor, file, dto, extractRequestContext(req));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  get(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.signatures.get(tenantId, id);
  }

  @Get(':id/download-url')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  downloadUrl(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.signatures.downloadUrl(tenantId, actor, id, extractRequestContext(req));
  }

  @Get(':id/verify')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  @ApiOperation({
    summary: 'Re-hash the stored PDF and compare with the hash taken at signing time',
  })
  verify(@CurrentTenant() tenantId: string, @Param() { id }: IdParamDto) {
    return this.signatures.verify(tenantId, id);
  }
}
