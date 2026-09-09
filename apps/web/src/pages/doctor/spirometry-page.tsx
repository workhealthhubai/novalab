import { PERMISSIONS, type SpirometryPattern } from '@osgb/shared-types';
import { Paperclip, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppButton } from '@/design-system/app-button';
import { DateRangePicker, type DateRangeValue } from '@/design-system/date-range-picker';
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { FilterChip } from '@/design-system/filter-chip';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { Pagination } from '@/design-system/pagination';
import { StatusBadge } from '@/design-system/status-badge';
import { formatDateTime, maskNationalId, patientPath } from '@/features/patients/patient-utils';
import {
  litres,
  newSpirometryPath,
  PATTERN,
  PATTERNS,
  percent,
  spirometryPath,
} from '@/features/spirometry/spirometry-labels';
import { useSpirometryTests } from '@/features/spirometry/use-spirometry';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermissions } from '@/hooks/use-permissions';
import {
  PendingProtocolRows,
  RecordStatusCells,
  WorkStatusChips,
} from '@/features/protocols/pending-rows';
import { usePendingProtocols, type WorkStatus } from '@/features/protocols/use-protocols';

export function SpirometryPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const [search, setSearch] = useState('');
  const [pattern, setPattern] = useState<SpirometryPattern | null>(null);
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [work, setWork] = useState<WorkStatus>('ALL');
  const pending = usePendingProtocols('SPIROMETRY', work, can(PERMISSIONS.SPIROMETRY_MANAGE));
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const tests = useSpirometryTests({
    page,
    pageSize: 20,
    ...(patientId ? { employeeId: patientId } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(pattern ? { pattern } : {}),
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  });

  return (
    <>
      <PageHeader
        title="Spirometri"
        description="Solunum fonksiyon testleri: FVC, FEV1, FEV1/FVC, beklenen değerler, patern ve başlangıca göre FEV1 düşüşü."
        breadcrumbs={[{ label: 'Doktor Modülü' }, { label: 'Spirometri' }]}
        actions={
          <Can permission={PERMISSIONS.SPIROMETRY_MANAGE}>
            <AppButton asChild>
              <Link to={newSpirometryPath(patientId ? { patientId } : {})}>
                <Plus />
                Yeni Test
              </Link>
            </AppButton>
          </Can>
        }
      />
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                aria-label="Hasta ara"
                placeholder="Ad veya TC Kimlik No"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <DateRangePicker
              id="sp-range"
              value={range}
              onChange={(r) => {
                setRange(r);
                setPage(1);
              }}
              placeholder="Test tarihi aralığı"
              max={new Date()}
              className="w-full sm:ml-auto sm:w-72"
            />
          </div>
          <div
            role="group"
            aria-label="Patern filtresi"
            className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            <WorkStatusChips
              value={work}
              onChange={(v) => {
                setWork(v);
                setPage(1);
              }}
              pendingCount={pending.total}
            />
            <span className="mx-1 self-center text-border">|</span>
            <FilterChip
              label="Tüm paternler"
              active={pattern === null}
              onClick={() => {
                setPattern(null);
                setPage(1);
              }}
            />
            {PATTERNS.map((p) => (
              <FilterChip
                key={p}
                label={PATTERN[p].label}
                active={pattern === p}
                onClick={() => {
                  setPattern(pattern === p ? null : p);
                  setPage(1);
                }}
              />
            ))}
          </div>
        </div>
        {tests.isPending ? (
          <LoadingState title="Testler yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {tests.error ? (
          <ErrorState onRetry={() => void tests.refetch()} className="rounded-none border-0" />
        ) : null}
        {tests.data ? (
          tests.data.items.length === 0 && pending.rows.length === 0 ? (
            <EmptyState
              title="Spirometri testi yok"
              description='"Yeni Test" ile cihaz değerlerini girin.'
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Hasta</TableHead>
                    <TableHead>FVC</TableHead>
                    <TableHead>FEV1</TableHead>
                    <TableHead>FEV1/FVC</TableHead>
                    <TableHead>Patern</TableHead>
                    <TableHead>Protokol</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <PendingProtocolRows
                    rows={pending.rows}
                    fill={5}
                    action={(row) => (
                      <AppButton size="sm" variant="secondary" asChild>
                        <Link
                          to={newSpirometryPath({ patientId: row.employee.id, protocolId: row.id })}
                        >
                          Testi gir
                        </Link>
                      </AppButton>
                    )}
                  />
                  {work !== 'PENDING' &&
                    tests.data.items.map((t) => {
                      const p = t.pattern ?? t.analysis.pattern;
                      return (
                        <TableRow
                          key={t.id}
                          className="cursor-pointer"
                          onClick={() => void navigate(spirometryPath(t.id))}
                        >
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(t.performedAt)}
                            {t.isBaseline ? (
                              <Badge variant="neutral" className="ml-2">
                                Başlangıç
                              </Badge>
                            ) : null}
                            {t.documentId ? (
                              <Paperclip
                                className="ml-2 inline size-3.5 text-muted-foreground"
                                aria-label="Çıktı ekli"
                              />
                            ) : null}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            <Link
                              to={patientPath(t.employee.id)}
                              className="hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t.employee.firstName} {t.employee.lastName}
                            </Link>
                            <span className="block font-mono text-xs font-normal text-muted-foreground">
                              {maskNationalId(t.employee.nationalId)}
                            </span>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {litres(t.fvc)}
                            <span className="block text-xs text-muted-foreground">
                              {percent(t.analysis.fvcPercent)} beklenen
                            </span>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {litres(t.fev1)}
                            <span className="block text-xs text-muted-foreground">
                              {percent(t.analysis.fev1Percent)} beklenen
                            </span>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {percent(t.analysis.ratio)}
                          </TableCell>
                          <TableCell>
                            {p ? (
                              <StatusBadge status={PATTERN[p].status} label={PATTERN[p].label} />
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {t.protocol?.protocolNumber ?? '—'}
                          </TableCell>
                          <RecordStatusCells to={spirometryPath(t.id)} />
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
              {work !== 'PENDING' ? (
                <Pagination meta={tests.data.meta} onPageChange={setPage} />
              ) : null}
            </>
          )
        ) : null}
      </div>
    </>
  );
}
