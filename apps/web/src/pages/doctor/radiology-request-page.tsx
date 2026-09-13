import { PERMISSIONS } from '@osgb/shared-types';
import { Ban, ExternalLink, Link2, RefreshCw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AppButton } from '@/design-system/app-button';
import { ConfirmDialog } from '@/design-system/confirm-dialog';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { SectionCard } from '@/design-system/section-card';
import { StatusBadge } from '@/design-system/status-badge';
import { toast } from '@/design-system/toast';
import {
  formatDate,
  formatDateTime,
  maskNationalId,
  patientPath,
} from '@/features/patients/patient-utils';
import { LinkStudyDialog } from '@/features/radiology/link-study-dialog';
import { MODALITY_LABELS, RADIOLOGY_STATUS } from '@/features/radiology/radiology-labels';
import {
  openInViewer,
  useRadiologyMutations,
  useRadiologyRequest,
  useStudy,
  useStudyPreview,
} from '@/features/radiology/use-radiology';
import { toApiError } from '@/services/api-client';

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-mono text-sm break-all' : 'text-sm'}>{value || '—'}</dd>
    </div>
  );
}

/** Object URL for a blob, revoked when the blob changes or the component unmounts. */
function useObjectUrl(blob: Blob | null | undefined): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
}

export function RadiologyRequestPage() {
  const { requestId } = useParams<'requestId'>();
  const request = useRadiologyRequest(requestId);
  const r = request.data;
  const linked = Boolean(r?.studyInstanceUid);
  const study = useStudy(requestId, linked);
  const preview = useStudyPreview(requestId, r?.studyInstanceUid ?? null);
  const previewUrl = useObjectUrl(preview.data);
  const { cancel, report, retryWorklist } = useRadiologyMutations();
  const [linkOpen, setLinkOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSeed, setReportSeed] = useState<string | null | undefined>(undefined);
  if (r && reportSeed !== r.reportText) {
    setReportSeed(r.reportText);
    setReportText(r.reportText ?? '');
  }

  if (request.isPending) return <LoadingState title="İstek yükleniyor…" />;
  if (request.error || !r) return <ErrorState onRetry={() => void request.refetch()} />;

  const active = r.status !== 'CANCELLED';
  const open = async () => {
    setOpening(true);
    try {
      await openInViewer(r.id);
    } catch (error) {
      toast.error('Görüntüleyici açılamadı', toApiError(error).message);
    } finally {
      setOpening(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`${r.employee.firstName} ${r.employee.lastName} · ${r.modality}${r.bodyPart ? ` ${r.bodyPart}` : ''}`}
        description={`İstek ${formatDateTime(r.requestedAt)}`}
        breadcrumbs={[
          { label: 'Doktor Modülü' },
          { label: 'Radyoloji', to: PATHS.radiology },
          { label: r.bodyPart ?? r.modality },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              status={RADIOLOGY_STATUS[r.status].status}
              label={RADIOLOGY_STATUS[r.status].label}
              className="self-center"
            />
            {linked ? (
              <AppButton onClick={() => void open()} loading={opening}>
                <ExternalLink />
                Görüntüleyicide Aç
              </AppButton>
            ) : null}
            {active && r.status !== 'REPORTED' ? (
              <Can permission={PERMISSIONS.RADIOLOGY_CREATE}>
                <AppButton variant="secondary" onClick={() => setLinkOpen(true)}>
                  <Link2 />
                  {linked ? 'Çalışmayı değiştir' : 'PACS Çalışması Bağla'}
                </AppButton>
                <AppButton variant="ghost" onClick={() => setCancelOpen(true)}>
                  <Ban />
                  İptal et
                </AppButton>
              </Can>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <SectionCard title="İstek">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Hasta" value={`${r.employee.firstName} ${r.employee.lastName}`} />
              <Field label="TC Kimlik No" value={maskNationalId(r.employee.nationalId)} mono />
              <Field label="Modalite" value={MODALITY_LABELS[r.modality]} />
              <Field label="Bölge / tetkik" value={r.bodyPart} />
              <Field label="İstek tarihi" value={formatDateTime(r.requestedAt)} />
              <Field label="Erişim no" value={r.accessionNumber} mono />
              <Field label="Cihaz iş listesi" value={r.worklistStatus} />
              <Field
                label="Görüntü alındı"
                value={r.completedAt ? formatDateTime(r.completedAt) : null}
              />
            </dl>
            {r.clinicalInfo ? (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Klinik bilgi</p>
                <p className="text-sm whitespace-pre-wrap">{r.clinicalInfo}</p>
              </div>
            ) : null}
            {!linked && (r.worklistStatus === 'FAILED' || r.worklistStatus === 'NOT_CONFIGURED') ? (
              <Can permission={PERMISSIONS.RADIOLOGY_CREATE}>
                <AppButton
                  className="mt-3"
                  size="sm"
                  variant="secondary"
                  loading={retryWorklist.isPending}
                  onClick={() =>
                    retryWorklist.mutate(r.id, {
                      onSuccess: () => toast.success('Cihaz iş listesi yenilendi'),
                      onError: (error) =>
                        toast.error('İş listesi yayınlanamadı', toApiError(error).message),
                    })
                  }
                >
                  <RefreshCw />
                  İş listesini yeniden yayınla
                </AppButton>
              </Can>
            ) : null}
            <Link
              to={patientPath(r.employee.id)}
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Hasta kartı
            </Link>
          </SectionCard>

          <SectionCard
            title="PACS çalışması"
            description={linked ? 'Bağlı DICOM çalışması' : 'Henüz çalışma bağlanmadı.'}
          >
            {linked ? (
              <>
                {study.isPending ? (
                  <LoadingState title="PACS sorgulanıyor…" className="min-h-16" />
                ) : null}
                {study.error ? (
                  <p className="text-sm text-destructive">{toApiError(study.error).message}</p>
                ) : null}
                {study.data === null ? (
                  <p className="text-sm text-warning">
                    Çalışma PACS'ta bulunamadı (silinmiş olabilir).
                  </p>
                ) : null}
                {study.data ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Açıklama" value={study.data.description} />
                    <Field
                      label="Çekim tarihi"
                      value={
                        study.data.studyDate
                          ? `${formatDate(study.data.studyDate)}${study.data.studyTime ? ` ${study.data.studyTime}` : ''}`
                          : null
                      }
                    />
                    <Field label="Modaliteler" value={study.data.modalities.join(', ')} />
                    <Field
                      label="Seri / görüntü"
                      value={`${study.data.seriesCount} / ${study.data.instanceCount}`}
                    />
                    <Field
                      label="DICOM hasta"
                      value={[
                        study.data.patientName,
                        study.data.patientId ? `ID ${study.data.patientId}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                    <Field label="Erişim no" value={study.data.accessionNumber} />
                    <div className="col-span-2">
                      <Field label="StudyInstanceUID" value={r.studyInstanceUid} mono />
                    </div>
                  </dl>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Çekim tamamlandığında "PACS Çalışması Bağla" ile görüntüleri bu isteğe bağlayın.
              </p>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard
            title="Önizleme"
            description="İlk görüntünün PACS tarafından üretilen küçük hâli; tanı için görüntüleyiciyi kullanın."
          >
            {!linked ? (
              <p className="text-sm text-muted-foreground">
                Çalışma bağlanınca önizleme burada görünür.
              </p>
            ) : preview.isPending ? (
              <LoadingState title="Önizleme yükleniyor…" className="min-h-40" />
            ) : previewUrl ? (
              <button
                type="button"
                onClick={() => void open()}
                className="block w-full overflow-hidden rounded-md border border-border bg-black focus-visible:ring-offset-0"
                aria-label="Görüntüleyicide aç"
              >
                <img
                  src={previewUrl}
                  alt="Çalışma önizlemesi"
                  className="mx-auto max-h-[420px] object-contain"
                />
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">Önizleme üretilemedi.</p>
            )}
          </SectionCard>

          <SectionCard
            title="Radyoloji raporu"
            description={
              r.reportedAt
                ? `Son rapor ${formatDateTime(r.reportedAt)}`
                : 'Rapor için önce çalışma bağlanmalı.'
            }
            actions={r.reportedAt ? <Badge variant="neutral">Raporlandı</Badge> : null}
          >
            <Can
              permission={PERMISSIONS.RADIOLOGY_REPORT}
              fallback={
                <p className="text-sm whitespace-pre-wrap">
                  {r.reportText || <span className="text-muted-foreground">Rapor yazılmamış.</span>}
                </p>
              }
            >
              <div className="flex flex-col gap-3">
                <Textarea
                  aria-label="Rapor metni"
                  rows={10}
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  disabled={!linked || !active || report.isPending}
                  placeholder="Bulgular ve sonuç…"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Rapor metni tıbbi veridir; denetim kaydında yalnızca durum değişikliği tutulur.
                  </p>
                  <AppButton
                    disabled={
                      !linked ||
                      !active ||
                      reportText.trim().length === 0 ||
                      reportText === (r.reportText ?? '')
                    }
                    loading={report.isPending}
                    onClick={() =>
                      report.mutate(
                        { id: r.id, reportText: reportText.trim() },
                        {
                          onSuccess: () => toast.success('Rapor kaydedildi'),
                          onError: (e) => toast.error('Rapor kaydedilemedi', toApiError(e).message),
                        },
                      )
                    }
                  >
                    <Save />
                    Raporu Kaydet
                  </AppButton>
                </div>
              </div>
            </Can>
          </SectionCard>
        </div>
      </div>

      <LinkStudyDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        request={r}
        onLinked={() => toast.success('Çalışma bağlandı')}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="İstek iptal edilsin mi?"
        description="İptal edilen isteğe çalışma bağlanamaz ve rapor yazılamaz."
        confirmLabel="İptal et"
        loading={cancel.isPending}
        onConfirm={() =>
          cancel.mutate(r.id, {
            onSuccess: () => {
              toast.success('İstek iptal edildi');
              setCancelOpen(false);
            },
            onError: (e) => toast.error('İptal edilemedi', toApiError(e).message),
          })
        }
      />
    </>
  );
}
