import { Download, FileUp, PenLine, Search, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PERMISSIONS } from '@osgb/shared-types';
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
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { Pagination } from '@/design-system/pagination';
import { SectionCard } from '@/design-system/section-card';
import { StatusBadge } from '@/design-system/status-badge';
import { toast } from '@/design-system/toast';
import { CONSENT_TYPE_LABELS, SUMMARY_STATE } from '@/features/consents/consent-labels';
import { useConsentSummary } from '@/features/consents/use-consents';
import { formatDateTime, maskNationalId, patientPath } from '@/features/patients/patient-utils';
import { usePatient } from '@/features/patients/use-patients';
import { PatientPicker } from '@/features/protocols/patient-picker';
import { SignConsentDialog, SignUploadDialog } from '@/features/signatures/sign-dialogs';
import { openSignedPdf, useSignatures } from '@/features/signatures/use-signatures';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermissions } from '@/hooks/use-permissions';
import { signaturesService } from '@/services/signatures.service';
import { toApiError } from '@/services/api-client';
import type { PatientListItem } from '@/types/patient';

function toListItem(p: NonNullable<ReturnType<typeof usePatient>['data']>): PatientListItem {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    nationalId: p.nationalId,
    registrationNumber: p.registrationNumber,
    phone: p.phone,
    birthDate: p.birthDate,
    status: p.status,
    identityVerificationStatus: p.identityVerificationStatus,
    company: p.company,
  };
}

export function DocumentSigningPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const [picked, setPicked] = useState<PatientListItem | null>(null);
  const preloaded = usePatient(!picked && patientIdParam ? patientIdParam : undefined);
  const patient = picked ?? (preloaded.data ? toListItem(preloaded.data) : null);
  const { can } = usePermissions();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [consentDialog, setConsentDialog] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const summary = useConsentSummary(patient?.id, can(PERMISSIONS.CONSENTS_READ));
  const signatures = useSignatures({
    page,
    pageSize: 20,
    ...(patient ? { employeeId: patient.id } : {}),
    ...(debouncedSearch && !patient ? { search: debouncedSearch } : {}),
  });

  const choosePatient = (next: PatientListItem | null) => {
    setPicked(next);
    setPage(1);
    setSearchParams(next ? { patientId: next.id } : {}, { replace: true });
  };

  const download = async (id: string) => {
    setBusyId(id);
    try {
      await openSignedPdf(id);
    } catch (error) {
      toast.error('Belge açılamadı', toApiError(error).message);
    } finally {
      setBusyId(null);
    }
  };

  const verify = async (id: string) => {
    setBusyId(id);
    try {
      const result = await signaturesService.verify(id);
      if (result.valid)
        toast.success('Belge doğrulandı', 'Saklanan PDF imza anındaki özetle eşleşiyor.');
      else
        toast.error('Belge değiştirilmiş!', 'Saklanan PDF özeti imza anındaki özetle eşleşmiyor.');
    } catch (error) {
      toast.error('Doğrulanamadı', toApiError(error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Belge İmza"
        description="Rıza metinlerini ve yüklenen PDF formlarını hastaya imza pedinde imzalatın; imzalı PDF'ler hasta belgelerinde saklanır."
        breadcrumbs={[{ label: 'Hasta Kayıt Kabul' }, { label: 'Belge İmza' }]}
      />

      <SectionCard title="Hasta" description="İmza alınacak hastayı seçin.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <PatientPicker id="ds-patient" value={patient} onChange={choosePatient} />
          </div>
          {patient ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={patientPath(patient.id)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Hasta kartı
              </Link>
              <AppButton size="sm" variant="ghost" onClick={() => choosePatient(null)}>
                <X />
                Seçimi kaldır
              </AppButton>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {patient ? (
        <SectionCard
          title="İmza bekleyen formlar"
          description="Yürürlükteki rıza metinlerine göre durum. Ek olarak herhangi bir PDF yükleyip imzalatabilirsiniz."
          actions={
            <Can permission={PERMISSIONS.DOCUMENTS_SIGN}>
              <AppButton size="sm" variant="secondary" onClick={() => setUploadOpen(true)}>
                <FileUp />
                PDF yükle ve imzalat
              </AppButton>
            </Can>
          }
        >
          {summary.isPending && can(PERMISSIONS.CONSENTS_READ) ? (
            <LoadingState title="Rıza durumu yükleniyor…" className="min-h-24" />
          ) : null}
          {summary.data ? (
            summary.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Henüz rıza metni yayınlanmamış (Genel Ayarlar → KVKK İzinleri).
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {summary.data.map((item) => (
                  <li
                    key={item.type}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">
                        {CONSENT_TYPE_LABELS[item.type]}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.latest
                          ? `v${item.latest.template.version} · ${formatDateTime(item.latest.givenAt)}`
                          : `yürürlükte v${item.activeTemplate.version}`}
                      </span>
                    </span>
                    <StatusBadge
                      status={SUMMARY_STATE[item.state].status}
                      label={SUMMARY_STATE[item.state].label}
                    />
                    {item.state !== 'CURRENT' ? (
                      <Can permission={PERMISSIONS.DOCUMENTS_SIGN}>
                        <AppButton
                          size="sm"
                          onClick={() => setConsentDialog(item.activeTemplate.id)}
                        >
                          <PenLine />
                          İmzalat
                        </AppButton>
                      </Can>
                    ) : null}
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </SectionCard>
      ) : null}

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center">
          <h2 className="text-sm font-semibold text-foreground">
            {patient ? 'Hastanın imzalı belgeleri' : 'Son imzalanan belgeler'}
          </h2>
          {!patient ? (
            <div className="relative min-w-0 flex-1 sm:ml-auto sm:max-w-xs">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                aria-label="Belge veya hasta ara"
                placeholder="Hasta, TC veya belge adı"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          ) : null}
        </div>
        {signatures.isPending ? (
          <LoadingState title="Belgeler yükleniyor…" className="min-h-40 rounded-none border-0" />
        ) : null}
        {signatures.error ? (
          <ErrorState onRetry={() => void signatures.refetch()} className="rounded-none border-0" />
        ) : null}
        {signatures.data ? (
          signatures.data.items.length === 0 ? (
            <EmptyState
              title="İmzalı belge yok"
              description={
                patient
                  ? 'Yukarıdaki formlardan birini imzalatın veya bir PDF yükleyin.'
                  : 'Bir hasta seçip imza alın.'
              }
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    {!patient ? <TableHead>Hasta</TableHead> : null}
                    <TableHead>Belge</TableHead>
                    <TableHead>İmzalayan</TableHead>
                    <TableHead>Alan personel</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signatures.data.items.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(s.signedAt)}
                      </TableCell>
                      {!patient ? (
                        <TableCell className="font-medium text-foreground">
                          {s.employee.firstName} {s.employee.lastName}
                          <span className="block font-mono text-xs font-normal text-muted-foreground">
                            {maskNationalId(s.employee.nationalId)}
                          </span>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <span className="font-medium text-foreground">{s.title}</span>
                        <span className="mt-0.5 block">
                          {s.consent ? (
                            <Badge variant="neutral">
                              Rıza metni · {CONSENT_TYPE_LABELS[s.consent.template.type]}
                            </Badge>
                          ) : (
                            <Badge variant="neutral">Yüklenen PDF</Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>{s.signerName}</TableCell>
                      <TableCell>
                        {s.collectedBy
                          ? `${s.collectedBy.firstName} ${s.collectedBy.lastName}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <AppButton
                          size="sm"
                          variant="ghost"
                          aria-label={`${s.title} doğrula`}
                          onClick={() => void verify(s.id)}
                          disabled={busyId === s.id}
                        >
                          <ShieldCheck />
                          Doğrula
                        </AppButton>
                        <AppButton
                          size="sm"
                          variant="ghost"
                          aria-label={`${s.title} indir`}
                          onClick={() => void download(s.id)}
                          disabled={busyId === s.id}
                        >
                          <Download />
                          PDF
                        </AppButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination meta={signatures.data.meta} onPageChange={setPage} />
            </>
          )
        ) : null}
      </div>

      <SignConsentDialog
        open={consentDialog !== null}
        onOpenChange={(open) => !open && setConsentDialog(null)}
        patient={patient}
        templateId={consentDialog}
        onSigned={(s) => toast.success('İmza kaydedildi', s.title)}
      />
      <SignUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        patient={patient}
        onSigned={(s) => toast.success('İmza kaydedildi', s.title)}
      />
    </>
  );
}
