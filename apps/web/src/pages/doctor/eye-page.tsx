import { type EyeRecommendation, PERMISSIONS } from '@osgb/shared-types';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Can } from '@/components/can';
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
  acuity,
  COLOR_VISION_LABELS,
  eyePath,
  newEyePath,
  RECOMMENDATION,
  RECOMMENDATIONS,
} from '@/features/eye/eye-labels';
import { useEyeExaminations } from '@/features/eye/use-eye';
import { formatDateTime, maskNationalId, patientPath } from '@/features/patients/patient-utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermissions } from '@/hooks/use-permissions';
import {
  PendingProtocolRows,
  RecordStatusCells,
  WorkStatusChips,
} from '@/features/protocols/pending-rows';
import { usePendingProtocols, type WorkStatus } from '@/features/protocols/use-protocols';

export function EyePage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const [search, setSearch] = useState('');
  const [recommendation, setRecommendation] = useState<EyeRecommendation | null>(null);
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [work, setWork] = useState<WorkStatus>('ALL');
  const pending = usePendingProtocols('EYE', work, can(PERMISSIONS.EYE_MANAGE));
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const exams = useEyeExaminations({
    page,
    pageSize: 20,
    ...(patientId ? { employeeId: patientId } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(recommendation ? { recommendation } : {}),
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  });

  return (
    <>
      <PageHeader
        title="Göz"
        description="Göz muayeneleri: uzak ve yakın görme keskinliği, renk görme, görme alanı ve öneri."
        breadcrumbs={[{ label: 'Doktor Modülü' }, { label: 'Göz' }]}
        actions={
          <Can permission={PERMISSIONS.EYE_MANAGE}>
            <AppButton asChild>
              <Link to={newEyePath(patientId ? { patientId } : {})}>
                <Plus />
                Yeni Muayene
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
              id="eye-range"
              value={range}
              onChange={(r) => {
                setRange(r);
                setPage(1);
              }}
              placeholder="Muayene tarihi aralığı"
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
              active={recommendation === null}
              onClick={() => {
                setRecommendation(null);
                setPage(1);
              }}
            />
            {RECOMMENDATIONS.map((r) => (
              <FilterChip
                key={r}
                label={RECOMMENDATION[r].label}
                active={recommendation === r}
                onClick={() => {
                  setRecommendation(recommendation === r ? null : r);
                  setPage(1);
                }}
              />
            ))}
          </div>
        </div>
        {exams.isPending ? (
          <LoadingState title="Muayeneler yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {exams.error ? (
          <ErrorState onRetry={() => void exams.refetch()} className="rounded-none border-0" />
        ) : null}
        {exams.data ? (
          exams.data.items.length === 0 && pending.rows.length === 0 ? (
            <EmptyState
              title="Göz muayenesi yok"
              description='"Yeni Muayene" ile değerleri girin.'
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Hasta</TableHead>
                    <TableHead>Sağ (en iyi)</TableHead>
                    <TableHead>Sol (en iyi)</TableHead>
                    <TableHead>Renk görme</TableHead>
                    <TableHead>Sonuç</TableHead>
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
                        <Link to={newEyePath({ patientId: row.employee.id, protocolId: row.id })}>
                          Muayeneyi gir
                        </Link>
                      </AppButton>
                    )}
                  />
                  {work !== 'PENDING' &&
                    exams.data.items.map((e) => (
                      <TableRow
                        key={e.id}
                        className="cursor-pointer"
                        onClick={() => void navigate(eyePath(e.id))}
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(e.performedAt)}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          <Link
                            to={patientPath(e.employee.id)}
                            className="hover:underline"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            {e.employee.firstName} {e.employee.lastName}
                          </Link>
                          <span className="block font-mono text-xs font-normal text-muted-foreground">
                            {maskNationalId(e.employee.nationalId)}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {acuity(e.analysis.bestRight)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {acuity(e.analysis.bestLeft)}
                        </TableCell>
                        <TableCell>{COLOR_VISION_LABELS[e.analysis.colorVision]}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={RECOMMENDATION[e.recommendation].status}
                            label={RECOMMENDATION[e.recommendation].label}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {e.protocol?.protocolNumber ?? '—'}
                        </TableCell>
                        <RecordStatusCells to={eyePath(e.id)} />
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {work !== 'PENDING' ? (
                <Pagination meta={exams.data.meta} onPageChange={setPage} />
              ) : null}
            </>
          )
        ) : null}
      </div>
    </>
  );
}
