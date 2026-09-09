import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { PERMISSIONS } from '@osgb/shared-types';
import { Can } from '@/components/can';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppButton } from '@/design-system/app-button';
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { Pagination } from '@/design-system/pagination';
import { toast } from '@/design-system/toast';
import { maskNationalId, patientPath } from '@/features/patients/patient-utils';
import { NewProtocolDialog } from '@/features/protocols/new-protocol-dialog';
import { StatusBadge } from '@/design-system/status-badge';
import { FITNESS_DECISION } from '@/features/examinations/examination-labels';
import { ProtocolStatusBadge } from '@/features/protocols/protocol-badges';
import { ProtocolFilters, type ProtocolFilterValues } from '@/features/protocols/protocol-filters';
import { PROTOCOL_TYPE_LABELS } from '@/features/protocols/protocol-labels';
import { itemProgress, protocolPath } from '@/features/protocols/protocol-utils';
import { useProtocols } from '@/features/protocols/use-protocols';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDateTime } from '@/features/patients/patient-utils';

export function ProtocolsPage() {
  const navigate = useNavigate();
  // Reception works day by day: the list opens on today's protocols; 'Temizle' widens it to all dates.
  const [filters, setFilters] = useState<ProtocolFilterValues>(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return { search: '', status: null, range: { from: today, to: today } };
  });
  const { search, status, range } = filters;
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const isIso = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
  const protocols = useProtocols({
    page,
    pageSize: 20,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status ? { status } : {}),
    ...(isIso(range.from) ? { from: range.from } : {}),
    ...(isIso(range.to) ? { to: range.to } : {}),
  });
  const filtered = Boolean(debouncedSearch || status || range.from || range.to);

  return (
    <>
      <PageHeader
        title="Protokol Listesi"
        description="Ziyaret protokolleri: hasta, neden, istenen tetkikler ve durumları."
        breadcrumbs={[{ label: 'Hasta Kayıt Kabul' }, { label: 'Protokol Listesi' }]}
        actions={
          <Can permission={PERMISSIONS.PROTOCOLS_CREATE}>
            <AppButton onClick={() => setDialogOpen(true)}>
              <Plus />
              Yeni Protokol
            </AppButton>
          </Can>
        }
      />

      <div className="rounded-xl border border-border bg-card">
        <ProtocolFilters
          value={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
        />

        {protocols.isPending ? (
          <LoadingState
            title="Protokoller yükleniyor…"
            className="min-h-48 rounded-none border-0"
          />
        ) : null}
        {protocols.error ? (
          <ErrorState onRetry={() => void protocols.refetch()} className="rounded-none border-0" />
        ) : null}
        {protocols.data ? (
          protocols.data.items.length === 0 ? (
            <EmptyState
              title={filtered ? 'Sonuç bulunamadı' : 'Henüz protokol açılmadı'}
              description={
                filtered
                  ? 'Filtreleri değiştirerek tekrar deneyin.'
                  : '"Yeni Protokol" ile bir hastaya ziyaret protokolü açın.'
              }
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protokol No</TableHead>
                    <TableHead>Hasta</TableHead>
                    <TableHead>TC Kimlik No</TableHead>
                    <TableHead>Neden</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead>Tetkik</TableHead>
                    <TableHead>Açılış</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Rapor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocols.data.items.map((protocol) => {
                    const progress = itemProgress(protocol.items);
                    return (
                      <TableRow
                        key={protocol.id}
                        className="cursor-pointer"
                        onClick={() => void navigate(protocolPath(protocol.id))}
                      >
                        <TableCell className="font-mono text-sm font-medium text-foreground">
                          <Link
                            to={protocolPath(protocol.id)}
                            className="hover:text-primary-dark"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {protocol.protocolNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          <Link
                            to={patientPath(protocol.employee.id)}
                            className="hover:text-primary-dark"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {protocol.employee.firstName} {protocol.employee.lastName}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {maskNationalId(protocol.employee.nationalId)}
                        </TableCell>
                        <TableCell>{PROTOCOL_TYPE_LABELS[protocol.type]}</TableCell>
                        <TableCell>{protocol.company?.name ?? '—'}</TableCell>
                        <TableCell className="tabular-nums">
                          {progress.done} / {progress.total}
                        </TableCell>
                        <TableCell>{formatDateTime(protocol.openedAt)}</TableCell>
                        <TableCell>
                          <ProtocolStatusBadge value={protocol.status} />
                        </TableCell>
                        <TableCell>
                          {protocol.examinations[0] ? (
                            <StatusBadge
                              status={
                                FITNESS_DECISION[protocol.examinations[0].fitnessDecision].status
                              }
                              label={
                                FITNESS_DECISION[protocol.examinations[0].fitnessDecision].label
                              }
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination meta={protocols.data.meta} onPageChange={setPage} />
            </>
          )
        ) : null}
      </div>

      <NewProtocolDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(protocol) => {
          toast.success('Protokol açıldı', protocol.protocolNumber);
          void navigate(protocolPath(protocol.id));
        }}
      />
    </>
  );
}
