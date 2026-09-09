export type ImportRowStatus = 'ok' | 'error' | 'exists' | 'duplicate';

export interface ImportRow {
  row: number;
  status: ImportRowStatus;
  errors: string[];
  display: Record<string, string | undefined>;
}

export interface ImportSummary {
  total: number;
  ok: number;
  error: number;
  exists: number;
  duplicate: number;
}

export interface ImportPreview {
  fileName: string;
  columns: { unknown: string[]; missing: string[] };
  summary: ImportSummary;
  rows: ImportRow[];
}

export interface ImportResult {
  summary: ImportSummary;
  imported: number;
  failed: Array<{ row: number; error: string; nationalId?: string; name?: string }>;
}

/** The three calls an import wizard needs; each domain implements them against its own endpoints. */
export interface ImportService {
  template(): Promise<Blob>;
  preview(file: File): Promise<ImportPreview>;
  import(file: File): Promise<ImportResult>;
}
