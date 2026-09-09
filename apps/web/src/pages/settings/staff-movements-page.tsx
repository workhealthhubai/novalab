import { PERMISSIONS } from '@osgb/shared-types';
import { format, subDays } from 'date-fns';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Combobox } from '@/design-system/combobox';
import { DateRangePicker, type DateRangeValue } from '@/design-system/date-range-picker';
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { FilterChip } from '@/design-system/filter-chip';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { Pagination } from '@/design-system/pagination';
import { StatusBadge } from '@/design-system/status-badge';
import {
  activityPath,
  CATEGORY_FILTERS,
  CATEGORY_LABELS,
  describeActivity,
} from '@/features/audit/activity-labels';
import { AuditEntryDialog } from '@/features/audit/audit-entry-dialog';
import { useActivity, useActivitySummary } from '@/features/audit/use-audit';
import { formatDateTime } from '@/features/patients/patient-utils';
import { useUsers } from '@/features/users/use-users';
import { usePermissions } from '@/hooks/use-permissions';
import type { ActivityCategory, ActivityEntry } from '@/types/audit';

const ISO = 'yyyy-MM-dd';
const SUMMARY_COLUMNS: Array<{ key: ActivityCategory; label: string }> = [
  { key: 'PATIENT', label: 'Hasta' },
  { key: 'PROTOCOL', label: 'Protokol' },
  { key: 'TEST', label: 'Tetkik' },
  { key: 'REPORT', label: 'Rapor' },
  { key: 'DOCUMENT', label: 'Belge' },
  { key: 'DEFINITION', label: 'Tanım' },
  { key: 'ACCESS', label: 'Tıbbi erişim' },
  { key: 'FAILURE', label: 'Başarısız' },
];

function userName(entry: { user: { firstName: string; lastName: string } | null }): string {
  return entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'Sistem';
}

export function StaffMovementsPage() {
  const { can } = usePermissions();
  const [range, setRange] = useState<DateRangeValue>(() => ({
    from: format(subDays(new Date(), 6), ISO),
    to: format(new Date(), ISO),
  }));
  const [userId, setUserId] = useState<string | null>(null);
  const [category, setCategory] = useState<ActivityCategory | null>(null);
  const [technical, setTechnical] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ActivityEntry | null>(null);
  const users = useUsers({ pageSize: 100 }, can(PERMISSIONS.USERS_READ));
  const userOptions = useMemo(
    () =>
      (users.data?.items ?? []).map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName}`,
      })),
    [users.data],
  );
  const periodQuery = {
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  };
  const activity = useActivity({
    page,
    pageSize: 50,
    ...periodQuery,
    ...(userId ? { userId } : {}),
    ...(category ? { category } : {}),
    ...(technical ? { technical: true } : {}),
  });
  const summary = useActivitySummary(periodQuery);
  const reset = () => setPage(1);

  return (
    <>
      <PageHeader
        title="Personel Hareketleri"
        description="Kullanıcıların ne yaptığını okunur cümlelerle gösterir: hangi hastayı kaydettiler, hangi protokolü açıp kapattılar, hangi tetkik ve raporları girdiler, hangi tıbbi kayıtlara baktılar."
        breadcrumbs={[{ label: 'Genel Ayarlar' }, { label: 'Personel Hareketleri' }]}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="w-full sm:w-64">
          <Combobox
            id="activity-user"
            value={userId}
            onChange={(v) => {
              setUserId(v);
              reset();
            }}
            options={userOptions}
            loading={users.isPending && can(PERMISSIONS.USERS_READ)}
            disabled={!can(PERMISSIONS.USERS_READ)}
            placeholder="Tüm kullanıcılar"
            searchPlaceholder="Kullanıcı ara…"
          />
        </div>
        <DateRangePicker
          id="activity-range"
          value={range}
          onChange={(v) => {
            setRange(v);
            reset();
          }}
          placeholder="Tarih aralığı"
          max={new Date()}
          className="w-full sm:ml-auto sm:w-72"
        />
      </div>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Hareketler</TabsTrigger>
          <TabsTrigger value="summary">Kullanıcı özeti</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border p-3">
              <div
                role="group"
                aria-label="Kategori filtresi"
                className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0"
              >
                <FilterChip
                  label="Tümü"
                  active={category === null}
                  onClick={() => {
                    setCategory(null);
                    reset();
                  }}
                />
                {CATEGORY_FILTERS.map((c) => (
                  <FilterChip
                    key={c}
                    label={CATEGORY_LABELS[c].label}
                    active={category === c}
                    onClick={() => {
                      setCategory(category === c ? null : c);
                      reset();
                    }}
                  />
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={technical}
                  onCheckedChange={(c) => {
                    setTechnical(c === true);
                    reset();
                  }}
                />
                <Label className="text-xs font-normal">
                  Teknik istek kayıtlarını da göster (HTTP çağrıları)
                </Label>
              </label>
            </div>
            {activity.isPending ? (
              <LoadingState
                title="Hareketler yükleniyor…"
                className="min-h-48 rounded-none border-0"
              />
            ) : null}
            {activity.error ? (
              <ErrorState
                onRetry={() => void activity.refetch()}
                className="rounded-none border-0"
              />
            ) : null}
            {activity.data ? (
              activity.data.items.length === 0 ? (
                <EmptyState
                  title="Bu filtrelerle hareket yok"
                  description="Tarih aralığını genişletin veya filtreleri temizleyin."
                  className="rounded-none border-0"
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zaman</TableHead>
                        <TableHead>Kullanıcı</TableHead>
                        <TableHead>Hareket</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activity.data.items.map((entry) => {
                        const path = activityPath(entry);
                        const sentence = entry.technical
                          ? `${entry.metadata?.method ?? ''} ${entry.metadata?.path ?? ''}`.trim()
                          : describeActivity(entry);
                        return (
                          <TableRow
                            key={entry.id}
                            className="cursor-pointer"
                            onClick={() => setSelected(entry)}
                          >
                            <TableCell className="whitespace-nowrap">
                              {formatDateTime(entry.createdAt)}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {userName(entry)}
                            </TableCell>
                            <TableCell>
                              {path ? (
                                <Link
                                  to={path}
                                  className="text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {sentence}
                                </Link>
                              ) : (
                                <span
                                  className={
                                    entry.technical ? 'font-mono text-xs text-muted-foreground' : ''
                                  }
                                >
                                  {sentence}
                                </span>
                              )}
                              {entry.metadata?.outcome === 'FAILURE' ? (
                                <span className="ml-2 text-xs text-destructive">
                                  {entry.metadata.errorCode ??
                                    `HTTP ${entry.metadata.statusCode ?? ''}`}
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                status={CATEGORY_LABELS[entry.category].status}
                                label={CATEGORY_LABELS[entry.category].label}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {entry.ipAddress ?? '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <Pagination meta={activity.data.meta} onPageChange={setPage} />
                </>
              )
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="summary">
          <div className="rounded-xl border border-border bg-card">
            {summary.isPending ? (
              <LoadingState title="Özet hazırlanıyor…" className="min-h-40 rounded-none border-0" />
            ) : null}
            {summary.error ? (
              <ErrorState
                onRetry={() => void summary.refetch()}
                className="rounded-none border-0"
              />
            ) : null}
            {summary.data ? (
              summary.data.length === 0 ? (
                <EmptyState title="Bu dönemde hareket yok" className="rounded-none border-0" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kullanıcı</TableHead>
                      <TableHead>Son giriş</TableHead>
                      <TableHead>Son hareket</TableHead>
                      {SUMMARY_COLUMNS.map((c) => (
                        <TableHead key={c.key} className="text-right">
                          {c.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-right">Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.data.map((row) => (
                      <TableRow
                        key={row.userId ?? 'anonymous'}
                        className="cursor-pointer"
                        onClick={() => {
                          setUserId(row.userId);
                          reset();
                        }}
                      >
                        <TableCell className="font-medium text-foreground">
                          {userName(row)}
                          {row.user ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {row.user.email}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(row.lastActivityAt)}
                        </TableCell>
                        {SUMMARY_COLUMNS.map((c) => (
                          <TableCell
                            key={c.key}
                            className={`text-right tabular-nums ${c.key === 'FAILURE' && row.counts[c.key] > 0 ? 'font-medium text-destructive' : ''}`}
                          >
                            {row.counts[c.key] || '—'}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-medium tabular-nums">
                          {row.total}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Bir satıra tıklayınca "Hareketler" sekmesi o kullanıcıya göre filtrelenir.
          </p>
        </TabsContent>
      </Tabs>

      <AuditEntryDialog entry={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </>
  );
}
