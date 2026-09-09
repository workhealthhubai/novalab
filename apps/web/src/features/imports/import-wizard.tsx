import { CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppButton } from '@/design-system/app-button';
import { ConfirmDialog } from '@/design-system/confirm-dialog';
import { FilterChip } from '@/design-system/filter-chip';
import { PageHeader } from '@/design-system/page-header';
import { SectionCard } from '@/design-system/section-card';
import { StatusBadge } from '@/design-system/status-badge';
import { toast } from '@/design-system/toast';
import { cn } from '@/lib/utils';
import { toApiError } from '@/services/api-client';
import type { ImportPreview, ImportResult, ImportRowStatus, ImportService } from '@/types/import';
import { IMPORT_STATUS } from './import-labels';

const ACCEPT = '.xlsx,.xls,.csv';

export interface ImportWizardProps {
  title: string;
  description: string;
  breadcrumbs: Array<{ label: string; to?: string }>;
  /** What the template contains, shown under step 1. */
  columnsHint: string;
  templateFileName: string;
  service: ImportService;
  /** Preview table columns, read from each row's `display` map. */
  displayColumns: Array<{ key: string; header: string; mono?: boolean }>;
  /** Noun used in buttons/toasts, e.g. "hasta" / "firma". */
  noun: string;
  /** Where "list" leads after a successful import. */
  listPath: string;
  listLabel: string;
  /** Called after a successful import (e.g. to invalidate queries). */
  onImported?: (result: ImportResult) => void;
}

/** Three-step sheet import: file → validated preview → confirmed import with a result report. */
export function ImportWizard({
  title,
  description,
  breadcrumbs,
  columnsHint,
  templateFileName,
  service,
  displayColumns,
  noun,
  listPath,
  listLabel,
  onImported,
}: ImportWizardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<'preview' | 'import' | 'template' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ImportRowStatus | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [dragging, setDragging] = useState(false);

  const chooseFile = (next: File | null) => {
    setFile(next);
    setPreview(null);
    setResult(null);
    setError(null);
    setFilter(null);
    if (!next) return;
    setBusy('preview');
    service
      .preview(next)
      .then(setPreview)
      .catch((cause: unknown) => setError(toApiError(cause).message))
      .finally(() => setBusy(null));
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    chooseFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0] ?? null);
  };

  const downloadTemplate = () => {
    setBusy('template');
    service
      .template()
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = templateFileName;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((cause: unknown) => toast.error('Şablon indirilemedi', toApiError(cause).message))
      .finally(() => setBusy(null));
  };

  const runImport = () => {
    if (!file) return;
    setBusy('import');
    service
      .import(file)
      .then((res) => {
        setResult(res);
        setConfirm(false);
        onImported?.(res);
        toast.success(
          `${res.imported} ${noun} aktarıldı`,
          res.failed.length > 0 ? `${res.failed.length} satır kaydedilemedi` : undefined,
        );
      })
      .catch((cause: unknown) => toast.error('Aktarma başarısız', toApiError(cause).message))
      .finally(() => setBusy(null));
  };

  const rows = preview
    ? filter
      ? preview.rows.filter((r) => r.status === filter)
      : preview.rows
    : [];

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={
          <AppButton variant="secondary" onClick={downloadTemplate} loading={busy === 'template'}>
            <Download />
            Şablonu İndir
          </AppButton>
        }
      />

      <SectionCard title="1. Dosya" description={columnsHint}>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={handleInput}
          aria-label="Aktarma dosyası seç"
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) =>
            (event.key === 'Enter' || event.key === ' ') && inputRef.current?.click()
          }
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
            dragging ? 'border-primary bg-primary-soft/40' : 'border-border hover:border-slate-300',
          )}
        >
          {file ? (
            <FileSpreadsheet className="size-8 text-primary-dark" aria-hidden />
          ) : (
            <Upload className="size-8 text-muted-foreground" aria-hidden />
          )}
          <p className="text-sm font-medium text-foreground">
            {file ? file.name : 'Dosyayı buraya bırakın veya seçmek için tıklayın'}
          </p>
          <p className="text-xs text-muted-foreground">
            .xlsx, .xls veya .csv · en fazla 5 MB ve 2.000 satır
          </p>
        </div>
        {busy === 'preview' ? (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            Dosya okunuyor ve doğrulanıyor…
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm font-medium text-destructive"
          >
            {error}
          </p>
        ) : null}
      </SectionCard>

      {preview ? (
        <SectionCard
          title="2. Önizleme"
          description={`${preview.fileName} · ${preview.summary.total} satır`}
          actions={
            !result ? (
              <AppButton
                onClick={() => setConfirm(true)}
                disabled={preview.summary.ok === 0}
                loading={busy === 'import'}
              >
                <Upload />
                {preview.summary.ok} kaydı aktar
              </AppButton>
            ) : null
          }
        >
          {preview.columns.unknown.length > 0 ? (
            <p className="mb-3 text-xs text-muted-foreground">
              Tanınmayan sütunlar yok sayıldı: {preview.columns.unknown.join(', ')}
            </p>
          ) : null}
          <div role="group" aria-label="Durum filtresi" className="mb-3 flex flex-wrap gap-1.5">
            <FilterChip
              label={`Tümü (${preview.summary.total})`}
              active={filter === null}
              onClick={() => setFilter(null)}
            />
            {(Object.keys(IMPORT_STATUS) as ImportRowStatus[]).map((status) => (
              <FilterChip
                key={status}
                label={`${IMPORT_STATUS[status].label} (${preview.summary[status]})`}
                active={filter === status}
                onClick={() => setFilter(filter === status ? null : status)}
              />
            ))}
          </div>
          <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Satır</TableHead>
                  {displayColumns.map((c) => (
                    <TableHead key={c.key}>{c.header}</TableHead>
                  ))}
                  <TableHead>Durum</TableHead>
                  <TableHead>Açıklama</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.row}>
                    <TableCell className="tabular-nums text-muted-foreground">{row.row}</TableCell>
                    {displayColumns.map((c, index) => (
                      <TableCell
                        key={c.key}
                        className={cn(
                          index === 0 && 'font-medium text-foreground',
                          c.mono && 'font-mono text-sm',
                        )}
                      >
                        {row.display[c.key] ?? '—'}
                      </TableCell>
                    ))}
                    <TableCell>
                      <StatusBadge
                        status={IMPORT_STATUS[row.status].status}
                        label={IMPORT_STATUS[row.status].label}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.errors.join('; ') || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      ) : null}

      {result ? (
        <SectionCard title="3. Sonuç">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="size-5 text-success" aria-hidden />
            {result.imported} {noun} aktarıldı; {result.summary.exists} zaten kayıtlı,{' '}
            {result.summary.error + result.summary.duplicate} satır atlandı
            {result.failed.length > 0 ? `, ${result.failed.length} satır kaydedilemedi` : ''}.
          </p>
          {result.failed.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-sm text-destructive">
              {result.failed.map((f) => (
                <li key={f.row}>
                  Satır {f.row} ({f.nationalId ?? f.name ?? '—'}): {f.error}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex gap-2">
            <AppButton variant="secondary" asChild>
              <Link to={listPath}>{listLabel}</Link>
            </AppButton>
            <AppButton variant="ghost" onClick={() => chooseFile(null)}>
              Yeni dosya
            </AppButton>
          </div>
        </SectionCard>
      ) : null}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="default"
        title={`${preview?.summary.ok ?? 0} ${noun} kaydı aktarılsın mı?`}
        description="Yalnızca 'Aktarılacak' durumundaki satırlar eklenir; hatalı, tekrar eden ve zaten kayıtlı satırlar atlanır. İşlem denetim kaydına yazılır."
        confirmLabel="Aktar"
        loading={busy === 'import'}
        onConfirm={runImport}
      />
    </>
  );
}
