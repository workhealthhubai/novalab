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
import { EmployeeImportsService } from './employee-imports.service';

const FILE_BODY = {
  schema: {
    type: 'object',
    required: ['file'],
    properties: { file: { type: 'string', format: 'binary' } },
  },
};

/** Toplu Hasta Aktarma. Own base path so it never collides with /employees/:id. */
@ApiTags('employee-imports')
@ApiBearerAuth()
@Controller('employee-imports')
export class EmployeeImportsController {
  constructor(private readonly imports: EmployeeImportsService) {}

  @Get('template')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_CREATE)
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="hasta-aktarma-sablonu.xlsx"')
  @ApiOperation({ summary: 'Download the XLSX template with headers and an example row' })
  template() {
    return new StreamableFile(this.imports.template());
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.EMPLOYEES_CREATE)
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
  @RequirePermissions(PERMISSIONS.EMPLOYEES_CREATE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({
    summary: 'Import the valid rows of the sheet; invalid/existing rows are skipped',
  })
  import(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @UploadedFile() file: UploadedSheetLike | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.imports.import(tenantId, actor, file, extractRequestContext(req));
  }
}
