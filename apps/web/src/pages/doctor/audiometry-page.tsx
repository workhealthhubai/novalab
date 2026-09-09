import { gradeHearing, PERMISSIONS } from '@osgb/shared-types';
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
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { Pagination } from '@/design-system/pagination';
import { StatusBadge } from '@/design-system/status-badge';
import {
  formatDb,
  GRADE_STATUS,
  newTestPath,
  testPath,
} from '@/features/audiometry/audiometry-labels';
import { useAudiometryTests } from '@/features/audiometry/use-audiometry';
import { formatDateTime, maskNationalId, patientPath } from '@/features/patients/patient-utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermissions } from '@/hooks/use-permissions';
import {
  PendingProtocolRows,
  RecordStatusCells,
  WorkStatusChips,
} from '@/features/protocols/pending-rows';
import { usePendingProtocols, type WorkStatus } from '@/features/protocols/use-protocols';

function GradeCell({ pta }: { pta: number | null }) {
  const grade = gradeHearing(pta);
  return (
    <span className="flex flex-wrap items-center gap-1.5 tabular-nums">
      {formatDb(pta)}
      {grade ? <StatusBadge status={GRADE_STATUS[grade.key]} label={grade.label} /> : null}
    </span>
  );
}

export function AudiometryPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [work, setWork] = useState<WorkStatus>('ALL');
  const pending = usePendingProtocols('AUDIOMETRY', work, can(PERMISSIONS.AUDIOMETRY_MANAGE));
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const tests = useAudiometryTests({
    page,
    pageSize: 20,
    ...(patientId ? { employeeId: patientId } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  });

  return (
    <>
      <PageHeader
        title="Odyometri"
        description="Saf ses odyometri testleri: eşikler, odyogram, işitme derecesi ve başlangıç testine göre eşik kayması."
        breadcrumbs={[{ label: 'Doktor Modülü' }, { label: 'Odyometri' }]}
        actions={
          <Can permission={PERMISSIONS.AUDIOMETRY_MANAGE}>
            <AppButton asChild>
              <Link to={newTestPath(patientId ? { patientId } : {})}>
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
              id="audiometry-range"
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
            aria-label="Durum filtresi"
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
              title="Odyometri testi yok"
              description='"Yeni Test" ile eşikleri girin.'
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Hasta</TableHead>
                    <TableHead>Sağ kulak</TableHead>
                    <TableHead>Sol kulak</TableHead>
                    <TableHead>Protokol</TableHead>
                    <TableHead>Uygulayan</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <PendingProtocolRows
                    rows={pending.rows}
                    fill={4}
                    action={(row) => (
                      <AppButton size="sm" variant="secondary" asChild>
                        <Link to={newTestPath({ patientId: row.employee.id, protocolId: row.id })}>
                          Testi gir
                        </Link>
                      </AppButton>
                    )}
                  />
                  {work !== 'PENDING' &&
                    tests.data.items.map((t) => (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() => void navigate(testPath(t.id))}
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(t.performedAt)}
                          {t.isBaseline ? (
                            <Badge variant="neutral" className="ml-2">
                              Başlangıç
                            </Badge>
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
                        <TableCell>
                          <GradeCell pta={t.ptaRight} />
                        </TableCell>
                        <TableCell>
                          <GradeCell pta={t.ptaLeft} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {t.protocol?.protocolNumber ?? '—'}
                        </TableCell>
                        <TableCell>
                          {t.performedBy
                            ? `${t.performedBy.firstName} ${t.performedBy.lastName}`
                            : '—'}
                        </TableCell>
                        <RecordStatusCells to={testPath(t.id)} />
                      </TableRow>
                    ))}
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
