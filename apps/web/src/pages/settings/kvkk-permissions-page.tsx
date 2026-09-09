import type { ConsentStatus, ConsentType } from '@osgb/shared-types';
import { DownloadCloud, FilePlus2, FileText, Plus, Search, Undo2 } from 'lucide-react';
import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppButton } from '@/design-system/app-button';
import { ConfirmDialog } from '@/design-system/confirm-dialog';
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { FilterChip } from '@/design-system/filter-chip';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { Pagination } from '@/design-system/pagination';
import { StatusBadge } from '@/design-system/status-badge';
import { toast } from '@/design-system/toast';
import { GiveConsentDialog, PublishTemplateDialog } from '@/features/consents/consent-dialogs';
import {
  CONSENT_METHOD_LABELS,
  CONSENT_STATUS,
  CONSENT_TYPE_LABELS,
  CONSENT_TYPES,
} from '@/features/consents/consent-labels';
import {
  useConsentMutations,
  useConsents,
  useConsentTemplates,
} from '@/features/consents/use-consents';
import { formatDate, formatDateTime, maskNationalId } from '@/features/patients/patient-utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { toApiError } from '@/services/api-client';
import { documentsService } from '@/services/documents.service';
import type { ConsentTemplate, PatientConsent } from '@/types/consent';

function TemplatesTab() {
  const templates = useConsentTemplates();
  const { importDefaults } = useConsentMutations();
  const [publish, setPublish] = useState<{ open: boolean; base: ConsentTemplate | null }>({
    open: false,
    base: null,
  });
  const [confirmImport, setConfirmImport] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <p className="text-sm text-muted-foreground">
          Her tür için yürürlükteki sürüm hastalara sunulur; eski sürümler kanıt için saklanır.
        </p>
        <Can permission={PERMISSIONS.CONSENTS_MANAGE}>
          <div className="ml-auto flex gap-2">
            <AppButton variant="secondary" size="sm" onClick={() => setConfirmImport(true)}>
              <DownloadCloud />
              Varsayılan metinleri yükle
            </AppButton>
            <AppButton size="sm" onClick={() => setPublish({ open: true, base: null })}>
              <Plus />
              Yeni metin
            </AppButton>
          </div>
        </Can>
      </div>
      {templates.isPending ? (
        <LoadingState title="Metinler yükleniyor…" className="min-h-48 rounded-none border-0" />
      ) : null}
      {templates.error ? (
        <ErrorState onRetry={() => void templates.refetch()} className="rounded-none border-0" />
      ) : null}
      {templates.data ? (
        templates.data.length === 0 ? (
          <EmptyState
            title="Henüz rıza metni yok"
            description='"Varsayılan metinleri yükle" ile başlayın; metinleri hukuk danışmanınızla gözden geçirin.'
            className="rounded-none border-0"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tür</TableHead>
                <TableHead>Sürüm</TableHead>
                <TableHead>Başlık</TableHead>
                <TableHead>Yürürlük</TableHead>
                <TableHead className="text-right">Rıza</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.data.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                >
                  <TableCell className="font-medium text-foreground">
                    {CONSENT_TYPE_LABELS[t.type]}
                  </TableCell>
                  <TableCell className="font-mono text-sm">v{t.version}</TableCell>
                  <TableCell>
                    {t.title}
                    {expanded === t.id ? (
                      <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs leading-5 whitespace-pre-wrap">
                        {t.body}
                      </pre>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(t.effectiveFrom)}</TableCell>
                  <TableCell className="text-right tabular-nums">{t._count.consents}</TableCell>
                  <TableCell>
                    {t.isActive ? (
                      <StatusBadge status="completed" label="Yürürlükte" />
                    ) : (
                      <Badge variant="neutral">Eski sürüm</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {t.isActive ? (
                      <Can permission={PERMISSIONS.CONSENTS_MANAGE}>
                        <AppButton
                          size="sm"
                          variant="ghost"
                          aria-label={`${CONSENT_TYPE_LABELS[t.type]} yeni sürüm`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPublish({ open: true, base: t });
                          }}
                        >
                          <FilePlus2 />
                          Yeni sürüm
                        </AppButton>
                      </Can>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : null}
      <PublishTemplateDialog
        open={publish.open}
        onOpenChange={(open) => setPublish((p) => ({ ...p, open }))}
        base={publish.base}
        onPublished={(t) =>
          toast.success('Sürüm yayınlandı', `${CONSENT_TYPE_LABELS[t.type]} v${t.version}`)
        }
      />
      <ConfirmDialog
        open={confirmImport}
        onOpenChange={setConfirmImport}
        tone="default"
        title="Varsayılan metinler yüklensin mi?"
        description="Aydınlatma, açık rıza, sağlık verisi rızası ve iletişim izni için genel taslaklar eklenir; zaten sürümü olan türler atlanır. Metinler hukuki inceleme gerektirir."
        confirmLabel="Yükle"
        loading={importDefaults.isPending}
        onConfirm={() =>
          importDefaults.mutate(undefined, {
            onSuccess: ({ imported, skipped }) => {
              toast.success(
                `${imported.length} metin yüklendi`,
                skipped.length > 0 ? `${skipped.length} tür zaten tanımlı` : undefined,
              );
              setConfirmImport(false);
            },
            onError: (e) => toast.error('Yüklenemedi', toApiError(e).message),
          })
        }
      />
    </div>
  );
}

async function openConsentPdf(documentId: string) {
  try {
    const { url } = await documentsService.downloadUrl(documentId);
    window.open(url, '_blank', 'noopener');
  } catch (error) {
    toast.error('Belge açılamadı', toApiError(error).message);
  }
}

function ConsentsTab() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ConsentType | null>(null);
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [page, setPage] = useState(1);
  const [giveOpen, setGiveOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState<PatientConsent | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const consents = useConsents({
    page,
    pageSize: 20,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
  });
  const templates = useConsentTemplates({ activeOnly: true });
  const { withdraw } = useConsentMutations();

  return (
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
          <Can permission={PERMISSIONS.CONSENTS_MANAGE}>
            <AppButton className="sm:ml-auto" onClick={() => setGiveOpen(true)}>
              <Plus />
              Rıza Kaydet
            </AppButton>
          </Can>
        </div>
        <div
          role="group"
          aria-label="Filtreler"
          className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          <FilterChip
            label="Tüm türler"
            active={type === null}
            onClick={() => {
              setType(null);
              setPage(1);
            }}
          />
          {CONSENT_TYPES.map((t) => (
            <FilterChip
              key={t}
              label={CONSENT_TYPE_LABELS[t]}
              active={type === t}
              onClick={() => {
                setType(type === t ? null : t);
                setPage(1);
              }}
            />
          ))}
          <span className="mx-1 self-center text-border">|</span>
          <FilterChip
            label="Verildi"
            active={status === 'GIVEN'}
            onClick={() => {
              setStatus(status === 'GIVEN' ? null : 'GIVEN');
              setPage(1);
            }}
          />
          <FilterChip
            label="Geri çekildi"
            active={status === 'WITHDRAWN'}
            onClick={() => {
              setStatus(status === 'WITHDRAWN' ? null : 'WITHDRAWN');
              setPage(1);
            }}
          />
        </div>
      </div>
      {consents.isPending ? (
        <LoadingState title="Rızalar yükleniyor…" className="min-h-48 rounded-none border-0" />
      ) : null}
      {consents.error ? (
        <ErrorState onRetry={() => void consents.refetch()} className="rounded-none border-0" />
      ) : null}
      {consents.data ? (
        consents.data.items.length === 0 ? (
          <EmptyState
            title="Kayıtlı rıza yok"
            description='"Rıza Kaydet" ile ya da hasta kartından ekleyin.'
            className="rounded-none border-0"
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Metin</TableHead>
                  <TableHead>Yöntem</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Alan</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consents.data.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">
                      {c.employee.firstName} {c.employee.lastName}
                      <span className="block font-mono text-xs font-normal text-muted-foreground">
                        {maskNationalId(c.employee.nationalId)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {CONSENT_TYPE_LABELS[c.template.type]}{' '}
                      <span className="font-mono text-xs text-muted-foreground">
                        v{c.template.version}
                      </span>
                    </TableCell>
                    <TableCell>{CONSENT_METHOD_LABELS[c.method]}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(c.givenAt)}
                      {c.withdrawnAt ? (
                        <span className="block text-xs text-muted-foreground">
                          geri: {formatDateTime(c.withdrawnAt)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {c.collectedBy ? `${c.collectedBy.firstName} ${c.collectedBy.lastName}` : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={CONSENT_STATUS[c.status].status}
                        label={CONSENT_STATUS[c.status].label}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {c.documentId ? (
                        <AppButton
                          size="sm"
                          variant="ghost"
                          aria-label={`${c.employee.firstName} ${c.employee.lastName} imzalı PDF`}
                          onClick={() => void openConsentPdf(c.documentId!)}
                        >
                          <FileText />
                          PDF
                        </AppButton>
                      ) : null}
                      {c.status === 'GIVEN' ? (
                        <Can permission={PERMISSIONS.CONSENTS_MANAGE}>
                          <AppButton
                            size="sm"
                            variant="ghost"
                            aria-label={`${c.employee.firstName} ${c.employee.lastName} rızasını geri çek`}
                            onClick={() => setWithdrawing(c)}
                          >
                            <Undo2 />
                            Geri çek
                          </AppButton>
                        </Can>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination meta={consents.data.meta} onPageChange={setPage} />
          </>
        )
      ) : null}
      <GiveConsentDialog
        open={giveOpen}
        onOpenChange={setGiveOpen}
        templates={templates.data ?? []}
        onGiven={() => toast.success('Rıza kaydedildi')}
      />
      <ConfirmDialog
        open={withdrawing !== null}
        onOpenChange={(open) => !open && setWithdrawing(null)}
        title="Rıza geri çekilsin mi?"
        description={
          withdrawing
            ? `${withdrawing.employee.firstName} ${withdrawing.employee.lastName} · ${CONSENT_TYPE_LABELS[withdrawing.template.type]} v${withdrawing.template.version}. Kayıt silinmez, geri çekildi olarak işaretlenir.`
            : undefined
        }
        confirmLabel="Geri çek"
        loading={withdraw.isPending}
        onConfirm={() =>
          withdrawing &&
          withdraw.mutate(
            { id: withdrawing.id },
            {
              onSuccess: () => {
                toast.success('Rıza geri çekildi');
                setWithdrawing(null);
              },
              onError: (e) => toast.error('İşlem başarısız', toApiError(e).message),
            },
          )
        }
      />
    </div>
  );
}

export function KvkkPermissionsPage() {
  return (
    <>
      <PageHeader
        title="KVKK İzinleri"
        description="Aydınlatma ve açık rıza metinlerinin sürümleri ile hastaların verdiği veya geri çektiği rızalar."
        breadcrumbs={[{ label: 'Genel Ayarlar' }, { label: 'KVKK İzinleri' }]}
      />
      <Tabs defaultValue="consents">
        <TabsList>
          <TabsTrigger value="consents">Hasta Rızaları</TabsTrigger>
          <TabsTrigger value="templates">Rıza Metinleri</TabsTrigger>
        </TabsList>
        <TabsContent value="consents">
          <ConsentsTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
