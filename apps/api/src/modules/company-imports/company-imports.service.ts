import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { CompaniesService } from '@/modules/companies/companies.service';
import {
  buildTemplate,
  foldKey,
  type ImportColumn,
  type ParseSummary,
  readSheet,
  summarize,
  type UploadedSheetLike,
} from '@/modules/imports/sheet-reader';
import {
  COMPANY_COLUMNS,
  COMPANY_HEADER_ALIASES,
  type CompanyColumnKey,
  type CompanyLookups,
  type ParsedCompanyRow,
  parseCompanyRow,
} from './company-import-parser';

export interface CompanyImportPreview {
  fileName: string;
  columns: { unknown: string[]; missing: string[] };
  summary: ParseSummary;
  rows: ParsedCompanyRow[];
}

export interface CompanyImportResult {
  summary: ParseSummary;
  imported: number;
  failed: Array<{ row: number; name: string; error: string }>;
}

const COLUMNS = COMPANY_COLUMNS as ReadonlyArray<ImportColumn<CompanyColumnKey>>;

@Injectable()
export class CompanyImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companies: CompaniesService,
    private readonly audit: AuditService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CompanyImportsService.name);
  }

  template(): Buffer {
    return buildTemplate(
      COLUMNS,
      [
        'Örnek Sanayi A.Ş.',
        '1234567890',
        '',
        'Tehlikeli',
        '0212 555 00 00',
        'info@ornek.com',
        'Örnek OSB 1. Cad. No:1',
      ],
      'Firmalar',
    );
  }

  async preview(
    tenantId: string,
    file: UploadedSheetLike | undefined,
  ): Promise<CompanyImportPreview> {
    const { rows, columns } = readSheet(file, COLUMNS, COMPANY_HEADER_ALIASES);
    const lookups = await this.lookups(tenantId);
    const seen = { names: new Set<string>(), taxNumbers: new Set<string>() };
    const parsed = rows.map((row, index) => parseCompanyRow(row, index + 2, lookups, seen));
    return { fileName: file!.originalname, columns, summary: summarize(parsed), rows: parsed };
  }

  async import(
    tenantId: string,
    actor: AuthenticatedUser,
    file: UploadedSheetLike | undefined,
    ctx: RequestContext,
  ): Promise<CompanyImportResult> {
    const preview = await this.preview(tenantId, file);
    const failed: CompanyImportResult['failed'] = [];
    let imported = 0;
    for (const row of preview.rows) {
      if (row.status !== 'ok' || !row.company) continue;
      try {
        await this.companies.create(tenantId, actor, row.company, ctx);
        imported += 1;
      } catch (error) {
        failed.push({
          row: row.row,
          name: row.company.name,
          error: error instanceof Error ? error.message : 'Kaydedilemedi',
        });
        this.logger.warn({ row: row.row, err: error }, 'company import row failed');
      }
    }
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'CompanyImport',
      entityId: null,
      newValue: {
        fileName: preview.fileName,
        summary: preview.summary,
        imported,
        failed: failed.length,
      },
      ...ctx,
    });
    return { summary: preview.summary, imported, failed };
  }

  private async lookups(tenantId: string): Promise<CompanyLookups> {
    const companies = await this.prisma.company.findMany({
      where: { tenantId, deletedAt: null },
      select: { name: true, taxNumber: true },
    });
    return {
      existingNames: new Set(companies.map((c) => foldKey(c.name))),
      existingTaxNumbers: new Set(
        companies.flatMap((c) => (c.taxNumber ? [c.taxNumber.replace(/\D/g, '')] : [])),
      ),
    };
  }
}
