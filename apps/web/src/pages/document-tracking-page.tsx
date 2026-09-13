import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PERMISSIONS } from '@osgb/shared-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/design-system/page-header';
import { AppButton } from '@/design-system/app-button';
import { LoadingState } from '@/design-system/loading-state';
import { ErrorState } from '@/design-system/error-state';
import { Pagination } from '@/design-system/pagination';
import { Combobox } from '@/design-system/combobox';
import { toast } from '@/design-system/toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { documentsService, type TrackedDocument } from '@/services/documents.service';
import { companiesService } from '@/services/companies.service';
import { toApiError } from '@/services/api-client';
import { formatDate } from '@/features/patients/patient-utils';
const selectClass = 'h-10 rounded-md border border-input bg-card px-3 text-sm';
export function DocumentTrackingPage() {
  const { can } = usePermissions();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [expiry, setExpiry] = useState('30');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const term = useDebouncedValue(companySearch, 300);
  const companies = useQuery({
    queryKey: ['companies', 'tracking', term],
    queryFn: () => companiesService.list(term),
    enabled: can(PERMISSIONS.COMPANIES_READ),
  });
  const records = useQuery({
    queryKey: ['documents', 'tracking', page, expiry, companyId],
    queryFn: () =>
      documentsService.list({ page, pageSize: 20, expiry, companyId: companyId ?? undefined }),
  });
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState('');
  const [medical, setMedical] = useState(false);
  const [edit, setEdit] = useState<TrackedDocument | null>(null);
  const [editDate, setEditDate] = useState('');
  const [uploadKey, setUploadKey] = useState(0);
  const invalidate = () => client.invalidateQueries({ queryKey: ['documents'] });
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Dosya seçin.');
      if (file.size > 25 * 1024 * 1024) throw new Error('Dosya en fazla 25 MB olabilir.');
      const form = new FormData();
      form.append('file', file);
      form.append('category', 'OTHER');
      form.append('isMedical', String(medical));
      if (date) form.append('expiresAt', date);
      if (companyId) form.append('companyId', companyId);
      return documentsService.upload(form);
    },
    onSuccess: () => {
      setFile(null);
      setDate('');
      setMedical(false);
      setUploadKey((v) => v + 1);
      setExpiry('all');
      setPage(1);
      void invalidate();
      toast.success('Belge eklendi');
    },
    onError: (e) => toast.error('Belge eklenemedi', toApiError(e).message),
  });
  const save = useMutation({
    mutationFn: () => documentsService.updateExpiry(edit!.id, editDate || null),
    onSuccess: () => {
      setEdit(null);
      void invalidate();
      toast.success('Bitiş tarihi güncellendi');
    },
    onError: (e) => toast.error('Tarih kaydedilemedi', toApiError(e).message),
  });
  const open = useMutation({
    mutationFn: (id: string) => documentsService.downloadUrl(id),
    onSuccess: ({ url }) => {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    },
    onError: (e) => toast.error('Belge açılamadı', toApiError(e).message),
  });
  return (
    <>
      <PageHeader
        title="Belge Süre Takibi"
        description="Sözleşme ve belgeleri yükleyin, bitiş tarihlerini takip edin. Süresi dolmuş belgeler ayrı filtrede gösterilir."
      />
      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="expiry-filter">Süre filtresi</Label>
          <select
            id="expiry-filter"
            className={`${selectClass} w-full`}
            value={expiry}
            onChange={(e) => {
              setExpiry(e.target.value);
              setPage(1);
            }}
          >
            <option value="30">Bugün ve önümüzdeki 30 gün</option>
            <option value="60">Önümüzdeki 60 gün</option>
            <option value="90">Önümüzdeki 90 gün</option>
            <option value="overdue">Süresi geçmiş</option>
            <option value="undated">Tarih belirtilmemiş</option>
            <option value="all">Tüm belgeler</option>
          </select>
        </div>
        {can(PERMISSIONS.COMPANIES_READ) && (
          <>
            <div>
              <Label htmlFor="tracking-company-search">Firma ara</Label>
              <Input
                id="tracking-company-search"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Firma adını yazın"
              />
            </div>
            <div>
              <Label htmlFor="tracking-company">Firma (liste ve yeni belge)</Label>
              <Combobox
                id="tracking-company"
                value={companyId}
                onChange={(id) => {
                  setCompanyId(id);
                  setPage(1);
                }}
                options={(companies.data?.items ?? []).map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Tüm firmalar / firmasız yükle"
                loading={companies.isPending}
              />
            </div>
            {companies.isError && (
              <p role="alert">
                Firma listesi yüklenemedi.{' '}
                <button onClick={() => void companies.refetch()}>Yeniden dene</button>
              </p>
            )}
          </>
        )}
      </div>
      {can(PERMISSIONS.DOCUMENTS_UPLOAD) && (
        <form
          className="space-y-3 rounded-xl border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            upload.mutate();
          }}
        >
          <h2 className="font-semibold">Sözleşme / belge ekle</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="tracking-file">Dosya (en fazla 25 MB)</Label>
              <Input
                key={uploadKey}
                id="tracking-file"
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label htmlFor="tracking-date">Bitiş tarihi (isteğe bağlı)</Label>
              <Input
                id="tracking-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={medical}
              onChange={(e) => setMedical(e.target.checked)}
            />
            Sağlık verisi içeriyor
          </label>
          <p className="text-xs text-muted-foreground">
            Seçili firma belgeye bağlanır. Bu ekran sözleşme dosyasının süresini takip eder;
            sözleşmenin hukuki onayını veya yenilenmesini yapmaz.
          </p>
          <AppButton type="submit" loading={upload.isPending}>
            Belgeyi ekle
          </AppButton>
        </form>
      )}
      {edit && (
        <form
          className="space-y-3 rounded-xl border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <h2 className="font-semibold">Bitiş tarihini düzenle · {edit.fileName}</h2>
          <Label htmlFor="edit-expiry">Yeni bitiş tarihi (boş bırakırsanız kaldırılır)</Label>
          <Input
            id="edit-expiry"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
          <div className="flex gap-2">
            <AppButton type="submit" loading={save.isPending}>
              Tarihi kaydet
            </AppButton>
            <AppButton variant="secondary" disabled={save.isPending} onClick={() => setEdit(null)}>
              Vazgeç
            </AppButton>
          </div>
        </form>
      )}
      {records.isPending ? (
        <LoadingState />
      ) : records.isError ? (
        <ErrorState onRetry={() => void records.refetch()} />
      ) : (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Belgeler ({records.data.meta.total})</h2>
          {!records.data.items.length ? (
            <p className="py-4 text-sm text-muted-foreground">
              Seçilen filtreye uygun belge yok. Eski belgelere tarih eklemek için “Tarih
              belirtilmemiş” filtresini kullanın.
            </p>
          ) : (
            <ul className="divide-y">
              {records.data.items.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium break-all">{r.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      Bitiş: {formatDate(r.expiresAt)}
                      {r.isMedical ? ' · Sağlık verisi' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <AppButton
                      size="sm"
                      variant="secondary"
                      disabled={open.isPending}
                      onClick={() => open.mutate(r.id)}
                    >
                      Belgeyi aç
                    </AppButton>
                    {can(PERMISSIONS.DOCUMENTS_UPLOAD) && (
                      <AppButton
                        size="sm"
                        variant="ghost"
                        disabled={save.isPending}
                        onClick={() => {
                          setEdit(r);
                          setEditDate(r.expiresAt?.slice(0, 10) ?? '');
                        }}
                      >
                        Tarihi düzenle
                      </AppButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination meta={records.data.meta} onPageChange={setPage} />
        </section>
      )}
    </>
  );
}
