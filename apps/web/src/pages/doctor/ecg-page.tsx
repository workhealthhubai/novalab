import { type EcgInterpretation, PERMISSIONS } from '@osgb/shared-types';
import { Paperclip, Plus, Search } from 'lucide-react';
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
  ecgPath,
  fmt,
  INTERPRETATION,
  INTERPRETATIONS,
  newEcgPath,
  RHYTHM_LABELS,
} from '@/features/ecg/ecg-labels';
import { useEcgRecords } from '@/features/ecg/use-ecg';
import { formatDateTime, maskNationalId, patientPath } from '@/features/patients/patient-utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermissions } from '@/hooks/use-permissions';
import {
  PendingProtocolRows,
  RecordStatusCells,
  WorkStatusChips,
} from '@/features/protocols/pending-rows';
import { usePendingProtocols, type WorkStatus } from '@/features/protocols/use-protocols';

export function EcgPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const [search, setSearch] = useState('');
  const [interpretation, setInterpretation] = useState<EcgInterpretation | null>(null);
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [work, setWork] = useState<WorkStatus>('ALL');
  const pending = usePendingProtocols('ECG', work, can(PERMISSIONS.ECG_MANAGE));
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const records = useEcgRecords({
    page,
    pageSize: 20,
    ...(patientId ? { employeeId: patientId } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(interpretation ? { interpretation } : {}),
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  });

  return (
    <>
      <PageHeader
        title="EKG"
        description="İstirahat EKG kayıtları: hız, ritim, aralıklar, aks, bulgular ve hekim yorumu; cihaz çıktısı eklenebilir."
        breadcrumbs={[{ label: 'Doktor Modülü' }, { label: 'EKG' }]}
        actions={
          <Can permission={PERMISSIONS.ECG_MANAGE}>
            <AppButton asChild>
              <Link to={newEcgPath(patientId ? { patientId } : {})}>
                <Plus />
                Yeni Kayıt
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
              id="ecg-range"
              value={range}
              onChange={(r) => {
                setRange(r);
                setPage(1);
              }}
              placeholder="Kayıt tarihi aralığı"
              max={new Date()}
              className="w-full sm:ml-auto sm:w-72"
            />
          </div>
          <div
            role="group"
            aria-label="Yorum filtresi"
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
              label="Tüm yorumlar"
              active={interpretation === null}
              onClick={() => {
                setInterpretation(null);
                setPage(1);
              }}
            />
            {INTERPRETATIONS.map((i) => (
              <FilterChip
                key={i}
                label={INTERPRETATION[i].label}
                active={interpretation === i}
                onClick={() => {
                  setInterpretation(interpretation === i ? null : i);
                  setPage(1);
                }}
              />
            ))}
          </div>
        </div>
        {records.isPending ? (
          <LoadingState title="Kayıtlar yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {records.error ? (
          <ErrorState onRetry={() => void records.refetch()} className="rounded-none border-0" />
        ) : null}
        {records.data ? (
          records.data.items.length === 0 && pending.rows.length === 0 ? (
            <EmptyState
              title="EKG kaydı yok"
              description='"Yeni Kayıt" ile cihaz değerlerini girin.'
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Hasta</TableHead>
                    <TableHead>Hız / ritim</TableHead>
                    <TableHead>PR / QRS / QTc</TableHead>
                    <TableHead>Yorum</TableHead>
                    <TableHead>Protokol</TableHead>
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
                        <Link to={newEcgPath({ patientId: row.employee.id, protocolId: row.id })}>
                          Kaydı gir
                        </Link>
                      </AppButton>
                    )}
                  />
                  {work !== 'PENDING' &&
                    records.data.items.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => void navigate(ecgPath(r.id))}
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(r.performedAt)}
                          {r.documentId ? (
                            <Paperclip
                              className="ml-2 inline size-3.5 text-muted-foreground"
                              aria-label="Çıktı ekli"
                            />
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
                        <TableCell className="tabular-nums">
                          {fmt(r.heartRate, '/dk')}
                          <span className="block text-xs text-muted-foreground">
                            {r.rhythm ? RHYTHM_LABELS[r.rhythm] : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums whitespace-nowrap">
                          {r.prInterval ?? '—'} / {r.qrsDuration ?? '—'} / {r.analysis.qtc ?? '—'}{' '}
                          ms
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={INTERPRETATION[r.interpretation].status}
                            label={INTERPRETATION[r.interpretation].label}
                          />
                          {r.analysis.flags.length > 0 ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {r.analysis.flags.length} uyarı
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.protocol?.protocolNumber ?? '—'}
                        </TableCell>
                        <RecordStatusCells to={ecgPath(r.id)} />
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {work !== 'PENDING' ? (
                <Pagination meta={records.data.meta} onPageChange={setPage} />
              ) : null}
            </>
          )
        ) : null}
      </div>
    </>
  );
}
