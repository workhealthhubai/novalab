import { PERMISSIONS, type PneumoconiosisResult } from '@osgb/shared-types';
import { Plus, Search } from 'lucide-react';
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
import {
  formatDate,
  formatDateTime,
  maskNationalId,
  patientPath,
} from '@/features/patients/patient-utils';
import {
  newReadingPath,
  readingPath,
  RESULT,
  RESULTS,
} from '@/features/pneumoconiosis/pneumoconiosis-labels';
import { usePneumoReadings } from '@/features/pneumoconiosis/use-pneumoconiosis';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermissions } from '@/hooks/use-permissions';
import {
  PendingProtocolRows,
  RecordStatusCells,
  WorkStatusChips,
} from '@/features/protocols/pending-rows';
import { usePendingProtocols, type WorkStatus } from '@/features/protocols/use-protocols';

export function PneumoconiosisPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<PneumoconiosisResult | null>(null);
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [work, setWork] = useState<WorkStatus>('ALL');
  const pending = usePendingProtocols(
    'PNEUMOCONIOSIS',
    work,
    can(PERMISSIONS.PNEUMOCONIOSIS_MANAGE),
  );
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const readings = usePneumoReadings({
    page,
    pageSize: 20,
    ...(patientId ? { employeeId: patientId } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(result ? { result } : {}),
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  });

  return (
    <>
      <PageHeader
        title="Pnömokonyoz"
        description="ILO 2011 sınıflamasına göre akciğer grafisi okumaları: profüzyon, şekil, zonlar, büyük opasiteler, plevral bulgular ve semboller."
        breadcrumbs={[{ label: 'Doktor Modülü' }, { label: 'Pnömokonyoz' }]}
        actions={
          <Can permission={PERMISSIONS.PNEUMOCONIOSIS_MANAGE}>
            <AppButton asChild>
              <Link to={newReadingPath(patientId ? { patientId } : {})}>
                <Plus />
                Yeni Okuma
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
              id="pn-range"
              value={range}
              onChange={(r) => {
                setRange(r);
                setPage(1);
              }}
              placeholder="Okuma tarihi aralığı"
              max={new Date()}
              className="w-full sm:ml-auto sm:w-72"
            />
          </div>
          <div
            role="group"
            aria-label="Sonuç filtresi"
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
              label="Tüm sonuçlar"
              active={result === null}
              onClick={() => {
                setResult(null);
                setPage(1);
              }}
            />
            {RESULTS.map((r) => (
              <FilterChip
                key={r}
                label={RESULT[r].label}
                active={result === r}
                onClick={() => {
                  setResult(result === r ? null : r);
                  setPage(1);
                }}
              />
            ))}
          </div>
        </div>
        {readings.isPending ? (
          <LoadingState title="Okumalar yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {readings.error ? (
          <ErrorState onRetry={() => void readings.refetch()} className="rounded-none border-0" />
        ) : null}
        {readings.data ? (
          readings.data.items.length === 0 && pending.rows.length === 0 ? (
            <EmptyState
              title="ILO okuması yok"
              description='"Yeni Okuma" ile sınıflamayı girin.'
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Okuma</TableHead>
                    <TableHead>Hasta</TableHead>
                    <TableHead>Profüzyon</TableHead>
                    <TableHead>Büyük opasite</TableHead>
                    <TableHead>Sonuç</TableHead>
                    <TableHead>Okuyucu</TableHead>
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
                          to={newReadingPath({ patientId: row.employee.id, protocolId: row.id })}
                        >
                          Okumayı gir
                        </Link>
                      </AppButton>
                    )}
                  />
                  {work !== 'PENDING' &&
                    readings.data.items.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => void navigate(readingPath(r.id))}
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(r.readAt)}
                          {r.filmDate ? (
                            <span className="block text-xs text-muted-foreground">
                              Film {formatDate(r.filmDate)}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          <Link
                            to={patientPath(r.employee.id)}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.employee.firstName} {r.employee.lastName}
                          </Link>
                          <span className="block font-mono text-xs font-normal text-muted-foreground">
                            {maskNationalId(r.employee.nationalId)}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono">
                          {r.filmQuality === 4 ? (
                            <Badge variant="neutral">Okunamaz</Badge>
                          ) : (
                            (r.profusion ?? '—')
                          )}
                          {r.shapePrimary ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {r.shapePrimary}
                              {r.shapeSecondary ? `/${r.shapeSecondary}` : ''}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>{r.largeOpacity === '0' ? '—' : r.largeOpacity}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={RESULT[r.result].status}
                            label={RESULT[r.result].label}
                          />
                          {r.analysis.flags.length > 0 ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {r.analysis.flags.length} uyarı
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {r.reader ? `${r.reader.firstName} ${r.reader.lastName}` : '—'}
                          {r.readerRole ? (
                            <span className="block text-xs text-muted-foreground">
                              {r.readerRole}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.protocol?.protocolNumber ?? '—'}
                        </TableCell>
                        <RecordStatusCells to={readingPath(r.id)} />
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {work !== 'PENDING' ? (
                <Pagination meta={readings.data.meta} onPageChange={setPage} />
              ) : null}
            </>
          )
        ) : null}
      </div>
    </>
  );
}
