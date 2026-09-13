import {
  OPERATION_DEFINITIONS,
  PERMISSIONS,
  type OperationField,
  type OperationInput,
  type OperationKind,
  type OperationRecord,
} from '@osgb/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import { AppButton } from '@/design-system/app-button';
import { ConfirmDialog } from '@/design-system/confirm-dialog';
import { DateRangePicker, type DateRangeValue } from '@/design-system/date-range-picker';
import { PageHeader } from '@/design-system/page-header';
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { Pagination } from '@/design-system/pagination';
import { toast } from '@/design-system/toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDate } from '@/features/patients/patient-utils';
import { toApiError } from '@/services/api-client';
import { operationsService } from '@/services/operations.service';
import { PATHS } from '@/app/router/navigation';


const selectClass = 'h-10 w-full rounded-md border border-input bg-card px-3 text-sm';
const formatMoney = (cents: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(cents / 100);
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function locked(kind: OperationKind, status: string) {
  return (
    (['lab', 'isg'].includes(kind) && status === 'Tamamlandı') ||
    (['accounting', 'payouts'].includes(kind) && status === 'Ödendi')
  );
}

function ReferenceField({
  kind,
  field,
  value,
  onChange,
  disabled,
  label,
}: {
  kind: OperationKind;
  field: OperationField;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  label?: string;
}) {
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search, 300);
  const options = useQuery({
    queryKey: ['operations', kind, 'options', field.key, term],
    queryFn: () => operationsService.options(kind, field.key, term),
    enabled: !disabled,
  });
  return (
    <div className="space-y-2">
      {!disabled && (
        <Input
          aria-label={`${field.label} ara`}
          placeholder="Seçenek ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      <select
        id={`op-${field.key}`}
        className={selectClass}
        required={field.required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{options.isFetching ? 'Yükleniyor…' : 'Seçin'}</option>
        {value && !options.data?.some((o) => o.id === value) && (
          <option value={value}>{label || `Seçili kayıt · ${value}`}</option>
        )}
        {options.data?.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {options.isError && (
        <p role="alert" className="text-sm text-destructive">
          Seçenekler yüklenemedi.{' '}
          <button type="button" onClick={() => void options.refetch()}>
            Tekrar dene
          </button>
        </p>
      )}
      {field.type === 'protocol' && value && (
        <Link
          className="text-sm text-primary underline"
          to={PATHS.protocolDetail.replace(':protocolId', value)}
        >
          Protokolü aç
        </Link>
      )}
    </div>
  );
}

function downloadOperation(record: OperationRecord) {
  const definition = OPERATION_DEFINITIONS[record.kind];
  const text = [
    definition.title,
    record.title,
    `Tarih: ${formatDate(record.date)}`,
    `Durum: ${record.status}`,
    `Sürüm: ${record.version}`,
    '',
    ...definition.fields.map(
      (f) => `${f.label}:\n${record.references?.[f.key] || record.fields[f.key] || '—'}\n`,
    ),
    ...(record.amountCents !== null ? [`Toplam: ${formatMoney(record.amountCents)}`] : []),
  ].join('\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${record.kind}-${record.id}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function OperationPage({ kind }: { kind: OperationKind }) {
  const definition = OPERATION_DEFINITIONS[kind];
  const { can } = usePermissions();
  const client = useQueryClient();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [editing, setEditing] = useState<OperationRecord | null>(null);
  const fresh = (): OperationInput => ({
    title: '',
    date: today(),
    status: definition.states[0]!,
    fields: {
      ...(params.get('protocolId') ? { protocolId: params.get('protocolId')! } : {}),
      ...(kind === 'isg' && params.get('companyId') ? { companyId: params.get('companyId')! } : {}),
    },
  });
  const [form, setForm] = useState<OperationInput>(fresh);
  const [open, setOpen] = useState(
    Boolean(params.get('protocolId')) && !params.get('recordId') && can(definition.write),
  );
  const [error, setError] = useState('');
  const term = useDebouncedValue(search, 300);
  const filters = {
    ...(params.get('protocolId') ? { protocolId: params.get('protocolId')! } : {}),
    ...(term ? { search: term } : {}),
    ...(status ? { status } : {}),
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  };
  const records = useQuery({
    queryKey: ['operations', kind, 'list', page, filters],
    queryFn: () => operationsService.list(kind, { page, pageSize: 20, ...filters }),
  });
  const summary = useQuery({
    queryKey: ['operations', kind, 'summary', filters],
    queryFn: () => operationsService.summary(kind, filters),
  });
  const templates = useQuery({
    queryKey: ['operations', 'templates', 'active'],
    queryFn: () => operationsService.list('templates', { status: 'Aktif', pageSize: 100 }),
    enabled: open && ['lab', 'isg'].includes(kind) && can(PERMISSIONS.REPORTS_EXPORT),
  });
  const save = useMutation({
    mutationFn: () => operationsService.save(kind, form, editing?.id),
    onSuccess: () => {
      setOpen(false);
      setEditing(null);
      setForm(fresh());
      setError('');
      void client.invalidateQueries({ queryKey: ['operations'] });
      void client.invalidateQueries({ queryKey: ['protocols'] });
      toast.success('Kayıt kaydedildi');
    },
    onError: (e) => setError(toApiError(e).message),
  });

  const [recordToDelete, setRecordToDelete] = useState<OperationRecord | null>(null);
  const removeMutation = useMutation({
    mutationFn: (id: string) => operationsService.remove(kind, id),
    onSuccess: () => {
      setRecordToDelete(null);
      void client.invalidateQueries({ queryKey: ['operations'] });
      void client.invalidateQueries({ queryKey: ['protocols'] });
      toast.success('Kayıt silindi');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const readOnly = !can(definition.write) || (editing !== null && locked(kind, editing.status));
  const monetary = kind === 'accounting' || kind === 'payouts';
  const updateField = (key: string, value: string) =>
    setForm((previous) => ({ ...previous, fields: { ...previous.fields, [key]: value } }));

  return (
    <>
      <PageHeader title={definition.title} description={definition.description} />
      {summary.data && (
        <div className="grid gap-3 sm:grid-cols-3">
          {definition.states.map((state) => {
            const data = summary.data.states.find((s) => s.status === state);
            return (
              <div className="rounded-xl border bg-card p-4" key={state}>
                <p className="text-sm text-muted-foreground">{state}</p>
                <p className="mt-1 text-2xl font-semibold">
                  {data?.count ?? 0} <span className="text-sm font-normal">kayıt</span>
                </p>
                {monetary && (
                  <p className="mt-2 text-primary">{formatMoney(data?.amountCents ?? 0)}</p>
                )}
              </div>
            );
          })}
          {summary.data.balanceCents !== null && (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                Tahsilat − ödeme (tarih ve arama filtresi)
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatMoney(summary.data.balanceCents)}
              </p>
            </div>
          )}
        </div>
      )}
      {summary.isError && (
        <ErrorState title="Özet yüklenemedi" onRetry={() => void summary.refetch()} />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="sm:max-w-xs"
          aria-label="Kayıt ara"
          placeholder="Kayıt başlığı ara…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Durum filtresi"
          className={`${selectClass} sm:w-44`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tüm durumlar</option>
          {definition.states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <DateRangePicker
          id="operations-range"
          value={range}
          onChange={(r) => {
            setRange(r);
            setPage(1);
          }}
        />
        {can(definition.write) && (
          <AppButton
            className="sm:ml-auto"
            onClick={() => {
              setEditing(null);
              setForm(fresh());
              setError('');
              setOpen(true);
            }}
          >
            Yeni kayıt
          </AppButton>
        )}
      </div>
      {open && (
        <form
          className="space-y-5 rounded-xl border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!readOnly) {
              setError('');
              save.mutate();
            }
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editing ? 'Kayıt detayı' : 'Yeni kayıt'}</h2>
            <AppButton
              type="button"
              variant="ghost"
              disabled={save.isPending}
              onClick={() => setOpen(false)}
            >
              Kapat
            </AppButton>
          </div>
          {readOnly && (
            <p className="text-sm text-muted-foreground">
              Bu kayıt salt okunur. Kesinleşmiş rapor ve ödemeler değiştirilemez.
            </p>
          )}
          <fieldset disabled={save.isPending || readOnly} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium">
                {kind === 'sub-osgb' ? 'Kurum adı' : 'Başlık'}
              </span>
              <Input
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Kayıt tarihi</span>
              <Input
                type="date"
                required
                value={form.date.slice(0, 10)}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Durum</span>
              <select
                className={selectClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {definition.states.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {templates.data && (
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium">Şablondan metin ekle</span>
                <select
                  className={selectClass}
                  value=""
                  onChange={(e) => {
                    const t = templates.data.items.find((t) => t.id === e.target.value);
                    if (t)
                      updateField(
                        'content',
                        [form.fields.content, t.fields.content].filter(Boolean).join('\n\n'),
                      );
                  }}
                >
                  <option value="">Şablon seçin</option>
                  {templates.data.items
                    .filter((t) => t.fields.category === (kind === 'lab' ? 'Laboratuvar' : 'İSG'))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {definition.fields.map((field) => (
              <div
                className={`space-y-2 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}
                key={field.key}
              >
                <label className="text-sm font-medium" htmlFor={`op-${field.key}`}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
                {['protocol', 'company', 'physician'].includes(field.type) ? (
                  <ReferenceField
                    label={editing?.references?.[field.key]}
                    kind={kind}
                    field={field}
                    value={form.fields[field.key] ?? ''}
                    onChange={(value) => updateField(field.key, value)}
                    disabled={
                      readOnly ||
                      save.isPending ||
                      (field.type === 'protocol' && Boolean(editing?.fields.protocolId))
                    }
                  />
                ) : field.type === 'textarea' ? (
                  <Textarea
                    id={`op-${field.key}`}
                    required={field.required}
                    maxLength={20000}
                    value={form.fields[field.key] ?? ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    rows={6}
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={`op-${field.key}`}
                    className={selectClass}
                    required={field.required}
                    value={form.fields[field.key] ?? ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                  >
                    <option value="">Seçin</option>
                    {field.options?.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`op-${field.key}`}
                    type={
                      field.type === 'money' || field.type === 'integer' ? 'number' : field.type
                    }
                    step={
                      field.type === 'money' ? '0.01' : field.type === 'integer' ? '1' : undefined
                    }
                    min={
                      field.type === 'money' ? '0.01' : field.type === 'integer' ? '1' : undefined
                    }
                    required={field.required}
                    maxLength={250}
                    value={form.fields[field.key] ?? ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </fieldset>
          {kind === 'payouts' && (
            <p className="font-medium">
              Hesaplanan hakediş:{' '}
              {formatMoney(
                Math.round(Number(form.fields.unitPrice || 0) * 100) *
                  Number(form.fields.quantity || 0),
              )}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {!readOnly && (
            <AppButton type="submit" loading={save.isPending}>
              Kaydet
            </AppButton>
          )}
          {editing && (
            <AppButton
              type="button"
              className="ml-2"
              variant="secondary"
              onClick={() => downloadOperation(editing)}
            >
              Metin çıktısı indir
            </AppButton>
          )}
        </form>
      )}
      {records.isPending ? (
        <LoadingState />
      ) : records.isError ? (
        <ErrorState
          description={toApiError(records.error).message}
          onRetry={() => void records.refetch()}
        />
      ) : (
        records.data && (
          <div className="overflow-hidden rounded-xl border bg-card">
            {records.data.items.length === 0 ? (
              <EmptyState
                title="Kayıt bulunamadı"
                description="Filtreleri değiştirin veya yeni kayıt oluşturun."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Başlık</TableHead>
                      <TableHead>Durum</TableHead>
                      {monetary && <TableHead>Tutar</TableHead>}
                      <TableHead>İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.data.items.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(record.date)}
                        </TableCell>
                        <TableCell className="font-medium">{record.title}</TableCell>
                        <TableCell>{record.status}</TableCell>
                        {monetary && (
                          <TableCell className="whitespace-nowrap">
                            {formatMoney(record.amountCents ?? 0)}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <AppButton
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditing(record);
                                setForm({
                                  title: record.title,
                                  date: record.date.slice(0, 10),
                                  status: record.status,
                                  fields: record.fields,
                                  version: record.version,
                                });
                                setError('');
                                setOpen(true);
                              }}
                            >
                              Aç
                            </AppButton>
                            {can(definition.write) && !locked(kind, record.status) && (
                              <AppButton
                                variant="secondary"
                                size="sm"
                                className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                                onClick={() => setRecordToDelete(record)}
                                title="Kaydı Sil"
                              >
                                <Trash2 className="size-4" />
                              </AppButton>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <Pagination meta={records.data.meta} onPageChange={setPage} />
          </div>
        )
      )}
      <ConfirmDialog
        open={Boolean(recordToDelete)}
        onOpenChange={(isOpen) => !isOpen && setRecordToDelete(null)}
        title={`${recordToDelete?.title || 'Kayıt'} Silinsin mi?`}
        description="Bu kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Evet, Sil"
        loading={removeMutation.isPending}
        onConfirm={() => {
          if (recordToDelete) {
            removeMutation.mutate(recordToDelete.id);
          }
        }}
      />
    </>
  );
}

