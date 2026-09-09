import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, CurrentUser, RequirePermissions, SkipAudit } from '@/common/decorators';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { MAX_IMPORT_BYTES, type UploadedSheetLike } from '@/modules/imports/sheet-reader';
import { CompanyImportsService } from './company-imports.service';

const FILE_BODY = {
  schema: {
    type: 'object',
    required: ['file'],
    properties: { file: { type: 'string', format: 'binary' } },
  },
};

/** Toplu Firma Aktarma. */
@ApiTags('company-imports')
@ApiBearerAuth()
@Controller('company-imports')
export class CompanyImportsController {
  constructor(private readonly imports: CompanyImportsService) {}

  @Get('template')
  @RequirePermissions(PERMISSIONS.COMPANIES_CREATE)
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="firma-aktarma-sablonu.xlsx"')
  template() {
    return new StreamableFile(this.imports.template());
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.COMPANIES_CREATE)
  @SkipAudit()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: 'Parse and validate the sheet without writing anything' })
  preview(@CurrentTenant() tenantId: string, @UploadedFile() file: UploadedSheetLike | undefined) {
    return this.imports.preview(tenantId, file);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.COMPANIES_CREATE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: 'Import the valid rows; invalid/existing rows are skipped' })
  import(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @UploadedFile() file: UploadedSheetLike | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.imports.import(tenantId, actor, file, extractRequestContext(req));
  }
}
