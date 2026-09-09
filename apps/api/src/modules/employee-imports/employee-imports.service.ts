import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EmployeesService } from '@/modules/employees/employees.service';
import {
  buildTemplate,
  type ImportColumn,
  readSheet,
  type UploadedSheetLike,
} from '@/modules/imports/sheet-reader';
import {
  foldKey,
  HEADER_ALIASES,
  IMPORT_COLUMNS,
  type ImportColumnKey,
  type ImportLookups,
  type ParsedRow,
  type ParseSummary,
  parseRow,
  summarize,
} from './import-parser';

export interface ImportPreview {
  fileName: string;
  columns: { unknown: string[]; missing: string[] };
  summary: ParseSummary;
  rows: ParsedRow[];
}

export interface ImportResult {
  summary: ParseSummary;
  imported: number;
  failed: Array<{ row: number; nationalId: string; error: string }>;
}

/** Toplu Hasta Aktarma: parse → validate → (on confirm) create rows one by one, skipping invalid ones. */
@Injectable()
export class EmployeeImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employees: EmployeesService,
    private readonly audit: AuditService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EmployeeImportsService.name);
  }

  /** Empty workbook with the template headers and one example row. */
  template(): Buffer {
    return buildTemplate(
      IMPORT_COLUMNS as ReadonlyArray<ImportColumn<ImportColumnKey>>,
      [
        '10000000146',
        'Ayşe',
        'Yılmaz',
        '15.01.1990',
        'K',
        '5321234567',
        'Fatma',
        'Mehmet',
        'ayse@example.com',
        'S-1',
        '',
        'Örnek A.Ş.',
        'Kaynakçı',
        '',
        'Örnek Mah. 1. Sk. No:1',
        '',
      ],
      'Hastalar',
    );
  }

  async preview(tenantId: string, file: UploadedSheetLike | undefined): Promise<ImportPreview> {
    const { rows, columns } = readSheet(
      file,
      IMPORT_COLUMNS as ReadonlyArray<ImportColumn<ImportColumnKey>>,
      HEADER_ALIASES,
    );
    const lookups = await this.lookups(tenantId);
    const seen = new Set<string>();
    const parsed = rows.map((row, index) => parseRow(row, index + 2, lookups, seen));
    return { fileName: file!.originalname, columns, summary: summarize(parsed), rows: parsed };
  }

  async import(
    tenantId: string,
    actor: AuthenticatedUser,
    file: UploadedSheetLike | undefined,
    ctx: RequestContext,
  ): Promise<ImportResult> {
    const preview = await this.preview(tenantId, file);
    const failed: ImportResult['failed'] = [];
    let imported = 0;
    for (const row of preview.rows) {
      if (row.status !== 'ok' || !row.employee) continue;
      try {
        await this.employees.create(tenantId, actor, row.employee, ctx);
        imported += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Kaydedilemedi';
        failed.push({ row: row.row, nationalId: row.employee.nationalId, error: message });
        this.logger.warn({ row: row.row, err: error }, 'import row failed');
      }
    }
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'EmployeeImport',
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

  private async lookups(tenantId: string): Promise<ImportLookups> {
    const [companies, occupations, employees] = await Promise.all([
      this.prisma.company.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, taxNumber: true },
      }),
      this.prisma.occupation.findMany({
        where: { tenantId, deletedAt: null, isActive: true },
        select: { id: true, name: true, code: true },
      }),
      this.prisma.employee.findMany({
        where: { tenantId, deletedAt: null, nationalId: { not: null } },
        select: { nationalId: true },
      }),
    ]);
    const companyByKey = new Map<string, { id: string; name: string }>();
    for (const c of companies) {
      companyByKey.set(foldKey(c.name), { id: c.id, name: c.name });
      if (c.taxNumber) companyByKey.set(c.taxNumber.replace(/\D/g, ''), { id: c.id, name: c.name });
    }
    const occupationByKey = new Map<string, { id: string; name: string }>();
    for (const o of occupations) {
      occupationByKey.set(foldKey(o.name), { id: o.id, name: o.name });
      if (o.code) occupationByKey.set(foldKey(o.code), { id: o.id, name: o.name });
    }
    return {
      companyByKey,
      occupationByKey,
      existingNationalIds: new Set(employees.flatMap((e) => (e.nationalId ? [e.nationalId] : []))),
    };
  }
}
