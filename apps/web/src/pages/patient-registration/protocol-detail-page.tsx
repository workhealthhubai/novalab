import type { ProtocolItemType } from '@osgb/shared-types';
import {
  Activity,
  Ban,
  Check,
  CheckCheck,
  Ear,
  Eye,
  FileHeart,
  Plus,
  RotateCcw,
  ScanSearch,
  Undo2,
  Wind,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { formatGsm, PERMISSIONS } from '@osgb/shared-types';
import { PATHS } from '@/app/router/navigation';
import { newTestPath } from '@/features/audiometry/audiometry-labels';
import { newEcgPath } from '@/features/ecg/ecg-labels';
import { newEyePath } from '@/features/eye/eye-labels';
import { reportPath } from '@/features/health-reports/report-labels';
import { useHealthReportMutations } from '@/features/health-reports/use-health-reports';
import { EXAMINATION_STATUS } from '@/features/examinations/examination-labels';
import { recordLinks } from '@/features/protocols/record-links';
import { newReadingPath } from '@/features/pneumoconiosis/pneumoconiosis-labels';
import { newSpirometryPath } from '@/features/spirometry/spirometry-labels';
import { Can } from '@/components/can';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AppButton } from '@/design-system/app-button';
import { ConfirmDialog } from '@/design-system/confirm-dialog';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { SectionCard } from '@/design-system/section-card';
import { toast } from '@/design-system/toast';
import { PatientAvatar } from '@/features/patients/patient-photo';
import {
  formatDate,
  formatDateTime,
  maskNationalId,
  patientPath,
} from '@/features/patients/patient-utils';
import { ProtocolItemStatusBadge, ProtocolStatusBadge } from '@/features/protocols/protocol-badges';
import {
  isProtocolEditable,
  PROTOCOL_ITEM_LABELS,
  PROTOCOL_ITEM_TYPES,
  PROTOCOL_TYPE_LABELS,
} from '@/features/protocols/protocol-labels';
import { itemProgress } from '@/features/protocols/protocol-utils';
import {
  useAddProtocolItems,
  useProtocol,
  useProtocolLifecycle,
  useProtocolRecords,
  useUpdateProtocol,
  useUpdateProtocolItem,
} from '@/features/protocols/use-protocols';
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
      <dd className={mono ? 'font-mono text-base text-foreground' : 'text-base text-foreground'}>
        {value || '—'}
      </dd>
    </div>
  );
}

export function ProtocolDetailPage() {
  const { protocolId = '' } = useParams<'protocolId'>();
  const protocol = useProtocol(protocolId);
  const navigate = useNavigate();
  const updateItem = useUpdateProtocolItem(protocolId);
  const records = useProtocolRecords(protocolId);
  const { openForProtocol: openReport } = useHealthReportMutations();
  const addItems = useAddProtocolItems(protocolId);
  const update = useUpdateProtocol(protocolId);
  const { close, cancel, reopen } = useProtocolLifecycle(protocolId);
  const [confirm, setConfirm] = useState<'close' | 'closePending' | 'cancel' | null>(null);
  const [adding, setAdding] = useState<ProtocolItemType[]>([]);
  const [itemNote, setItemNote] = useState<{ id: string; note: string; cancel: boolean } | null>(
    null,
  );
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const breadcrumbs = [
    { label: 'Hasta Kayıt Kabul' },
    { label: 'Protokol Listesi', to: PATHS.protocols },
    { label: protocol.data?.protocolNumber ?? 'Protokol' },
  ];

  if (protocol.isPending) {
    return (
      <>
        <PageHeader title="Protokol" breadcrumbs={breadcrumbs} />
        <LoadingState />
      </>
    );
  }
  if (protocol.error || !protocol.data) {
    return (
      <>
        <PageHeader title="Protokol" breadcrumbs={breadcrumbs} />
        <ErrorState
          title="Protokol bulunamadı"
          description={protocol.error ? toApiError(protocol.error).message : undefined}
          onRetry={() => void protocol.refetch()}
        />
      </>
    );
  }

  const p = protocol.data;
  const editable = isProtocolEditable(p.status);
  const progress = itemProgress(p.items);
  const pending = p.items.filter((item) => item.status === 'PENDING');
  const missingTypes = PROTOCOL_ITEM_TYPES.filter(
    (type) => !p.items.some((item) => item.type === type),
  );
  const fail = (title: string) => (error: unknown) => toast.error(title, toApiError(error).message);

  const setItemStatus = (itemId: string, status: 'PENDING' | 'DONE' | 'CANCELLED') => {
    if (status === 'CANCELLED')
      setItemNote({
        id: itemId,
        note: p.items.find((item) => item.id === itemId)?.note ?? '',
        cancel: true,
      });
    else updateItem.mutate({ itemId, status }, { onError: fail('Tetkik güncellenemedi') });
  };

  return (
    <>
      <PageHeader
        title={`Protokol ${p.protocolNumber}`}
        description={`${PROTOCOL_TYPE_LABELS[p.type]} · açılış ${formatDateTime(p.openedAt)} · ${p.openedBy.firstName} ${p.openedBy.lastName}`}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            {p.examinations[0] ? (
              <AppButton variant="ghost" asChild>
                <Link to={reportPath(p.examinations[0].id)}>
                  <FileHeart />
                  Rapor: {EXAMINATION_STATUS[p.examinations[0].status].label}
                </Link>
              </AppButton>
            ) : null}
            <Can permission={PERMISSIONS.PROTOCOLS_CLOSE}>
              {editable ? (
                <>
                  <AppButton variant="secondary" onClick={() => setConfirm('cancel')}>
                    <Ban />
                    İptal Et
                  </AppButton>
                  <AppButton
                    onClick={() => setConfirm(pending.length > 0 ? 'closePending' : 'close')}
                  >
                    <CheckCheck />
                    Protokolü Kapat
                  </AppButton>
                </>
              ) : (
                <AppButton
                  variant="secondary"
                  onClick={() => reopen.mutate(undefined, { onError: fail('Yeniden açılamadı') })}
                  loading={reopen.isPending}
                >
                  <RotateCcw />
                  Yeniden Aç
                </AppButton>
              )}
            </Can>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <ProtocolStatusBadge value={p.status} />
        <span className="text-sm text-muted-foreground">
          Tetkik: {progress.done} / {progress.total} tamamlandı
        </span>
        {p.closedAt ? (
          <span className="text-sm text-muted-foreground">
            · kapanış {formatDateTime(p.closedAt)}
            {p.closedBy ? ` · ${p.closedBy.firstName} ${p.closedBy.lastName}` : ''}
          </span>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard title="Hasta" className="lg:col-span-1">
          <div className="flex gap-4">
            <PatientAvatar
              patientId={p.employee.id}
              name={`${p.employee.firstName} ${p.employee.lastName}`}
              className="h-28 w-21"
            />
            <dl className="grid flex-1 grid-cols-1 gap-y-2">
              <div>
                <dt className="text-xs text-muted-foreground">Ad Soyad</dt>
                <dd>
                  <Link
                    to={patientPath(p.employee.id)}
                    className="text-base font-medium text-foreground hover:text-primary-dark"
                  >
                    {p.employee.firstName} {p.employee.lastName}
                  </Link>
                </dd>
              </div>
              <Field label="T.C. Kimlik No" value={maskNationalId(p.employee.nationalId)} mono />
              <Field label="Doğum Tarihi" value={formatDate(p.employee.birthDate)} />
              <Field
                label="GSM"
                value={p.employee.phone ? formatGsm(p.employee.phone) : null}
                mono
              />
              <Field label="Firma" value={p.company?.name} />
            </dl>
          </div>
        </SectionCard>

        <SectionCard
          title="Tetkikler"
          className="lg:col-span-2"
          actions={
            editable && missingTypes.length > 0 ? (
              <Can permission={PERMISSIONS.PROTOCOLS_UPDATE}>
                <AppButton
                  variant="secondary"
                  size="sm"
                  disabled={adding.length === 0}
                  loading={addItems.isPending}
                  onClick={() =>
                    addItems.mutate(adding, {
                      onSuccess: () => setAdding([]),
                      onError: fail('Tetkik eklenemedi'),
                    })
                  }
                >
                  <Plus />
                  Seçilenleri ekle
                </AppButton>
              </Can>
            ) : null
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tetkik</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tamamlanma</TableHead>
                <TableHead>Kayıt</TableHead>
                <TableHead>Not</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">
                    {PROTOCOL_ITEM_LABELS[item.type]}
                  </TableCell>
                  <TableCell>
                    <ProtocolItemStatusBadge value={item.status} />
                  </TableCell>
                  <TableCell>{item.completedAt ? formatDateTime(item.completedAt) : '—'}</TableCell>
                  <TableCell>
                    {recordLinks(records.data, item.type).length === 0 ? (
                      editable &&
                      item.status === 'PENDING' &&
                      (item.type === 'LAB' || item.type === 'ISG_REPORT') ? (
                        <Can
                          permission={
                            item.type === 'LAB'
                              ? PERMISSIONS.EXAMINATIONS_UPDATE
                              : PERMISSIONS.REPORTS_EXPORT
                          }
                        >
                          <Link
                            className="text-primary hover:underline"
                            to={`${item.type === 'LAB' ? PATHS.labResults : PATHS.isgReports}?protocolId=${p.id}${p.companyId ? `&companyId=${p.companyId}` : ''}`}
                          >
                            {item.type === 'LAB' ? 'Sonuç gir' : 'Rapor oluştur'}
                          </Link>
                        </Can>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      <ul className="flex flex-col gap-0.5 text-xs">
                        {recordLinks(records.data, item.type).map((link) => (
                          <li key={link.id}>
                            <Link
                              to={link.to}
                              className={
                                link.alert
                                  ? 'font-medium text-warning hover:underline'
                                  : 'text-primary hover:underline'
                              }
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                    {item.note ?? '—'}
                    {editable ? (
                      <Can permission={PERMISSIONS.PROTOCOLS_UPDATE}>
                        <AppButton
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setItemNote({ id: item.id, note: item.note ?? '', cancel: false })
                          }
                        >
                          Not / gerekçe
                        </AppButton>
                      </Can>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {editable ? (
                      <Can permission={PERMISSIONS.PROTOCOLS_UPDATE}>
                        <div className="flex justify-end gap-1">
                          {item.type === 'HEALTH_REPORT' && item.status !== 'CANCELLED' ? (
                            <Can permission={PERMISSIONS.EXAMINATIONS_CREATE}>
                              <AppButton
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  openReport.mutate(p.id, {
                                    onSuccess: (report) => void navigate(reportPath(report.id)),
                                    onError: (e) =>
                                      toast.error('Rapor açılamadı', toApiError(e).message),
                                  })
                                }
                                loading={openReport.isPending}
                              >
                                <FileHeart />
                                Raporu aç
                              </AppButton>
                            </Can>
                          ) : null}
                          {item.status === 'PENDING' && item.type === 'PNEUMOCONIOSIS' ? (
                            <Can permission={PERMISSIONS.PNEUMOCONIOSIS_MANAGE}>
                              <AppButton size="sm" variant="secondary" asChild>
                                <Link
                                  to={newReadingPath({ patientId: p.employeeId, protocolId: p.id })}
                                >
                                  <ScanSearch />
                                  Okumayı gir
                                </Link>
                              </AppButton>
                            </Can>
                          ) : null}
                          {item.status === 'PENDING' && item.type === 'EYE' ? (
                            <Can permission={PERMISSIONS.EYE_MANAGE}>
                              <AppButton size="sm" variant="secondary" asChild>
                                <Link
                                  to={newEyePath({ patientId: p.employeeId, protocolId: p.id })}
                                >
                                  <Eye />
                                  Muayeneyi gir
                                </Link>
                              </AppButton>
                            </Can>
                          ) : null}
                          {item.status === 'PENDING' && item.type === 'SPIROMETRY' ? (
                            <Can permission={PERMISSIONS.SPIROMETRY_MANAGE}>
                              <AppButton size="sm" variant="secondary" asChild>
                                <Link
                                  to={newSpirometryPath({
                                    patientId: p.employeeId,
                                    protocolId: p.id,
                                  })}
                                >
                                  <Wind />
                                  Testi gir
                                </Link>
                              </AppButton>
                            </Can>
                          ) : null}
                          {item.status === 'PENDING' && item.type === 'ECG' ? (
                            <Can permission={PERMISSIONS.ECG_MANAGE}>
                              <AppButton size="sm" variant="secondary" asChild>
                                <Link
                                  to={newEcgPath({ patientId: p.employeeId, protocolId: p.id })}
                                >
                                  <Activity />
                                  Kaydı gir
                                </Link>
                              </AppButton>
                            </Can>
                          ) : null}
                          {item.status === 'PENDING' && item.type === 'AUDIOMETRY' ? (
                            <Can permission={PERMISSIONS.AUDIOMETRY_MANAGE}>
                              <AppButton size="sm" variant="secondary" asChild>
                                <Link
                                  to={newTestPath({
                                    patientId: p.employeeId,
                                    protocolId: p.id,
                                  })}
                                >
                                  <Ear />
                                  Testi gir
                                </Link>
                              </AppButton>
                            </Can>
                          ) : null}
                          {item.status === 'PENDING' ? (
                            <>
                              <AppButton
                                size="sm"
                                variant="ghost"
                                aria-label={`${PROTOCOL_ITEM_LABELS[item.type]} tamamlandı`}
                                onClick={() => setItemStatus(item.id, 'DONE')}
                              >
                                <Check />
                                Tamamlandı
                              </AppButton>
                              <AppButton
                                size="sm"
                                variant="ghost"
                                aria-label={`${PROTOCOL_ITEM_LABELS[item.type]} iptal`}
                                onClick={() => setItemStatus(item.id, 'CANCELLED')}
                              >
                                <XCircle />
                                İptal
                              </AppButton>
                            </>
                          ) : (
                            <AppButton
                              size="sm"
                              variant="ghost"
                              aria-label={`${PROTOCOL_ITEM_LABELS[item.type]} geri al`}
                              onClick={() => setItemStatus(item.id, 'PENDING')}
                            >
                              <Undo2 />
                              Geri al
                            </AppButton>
                          )}
                        </div>
                      </Can>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {editable && missingTypes.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3">
              {missingTypes.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={`add-item-${type}`}
                    checked={adding.includes(type)}
                    onCheckedChange={(value) =>
                      setAdding((current) =>
                        value === true ? [...current, type] : current.filter((t) => t !== type),
                      )
                    }
                  />
                  <Label
                    htmlFor={`add-item-${type}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {PROTOCOL_ITEM_LABELS[type]}
                  </Label>
                </div>
              ))}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="Not" className="lg:col-span-3">
          <Textarea
            aria-label="Protokol notu"
            rows={2}
            value={noteDraft ?? p.notes ?? ''}
            disabled={!editable}
            onChange={(event) => setNoteDraft(event.target.value)}
            onBlur={() => {
              if (noteDraft !== null && noteDraft !== (p.notes ?? '')) {
                update.mutate(
                  { notes: noteDraft.trim() || null },
                  { onSuccess: () => setNoteDraft(null), onError: fail('Not kaydedilemedi') },
                );
              } else setNoteDraft(null);
            }}
            placeholder="Ziyaretle ilgili kısa not; odak dışına çıkınca kaydedilir."
          />
        </SectionCard>
      </div>

      <Dialog open={itemNote !== null} onOpenChange={(open) => !open && setItemNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {itemNote?.cancel ? 'Tetkik iptal gerekçesi' : 'Tetkik notu / gerekçesi'}
            </DialogTitle>
            <DialogDescription>
              İptal gerekçesi hekim değerlendirmesinde ve rapor çıktısında gösterilir.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Tetkik notu veya iptal gerekçesi"
            maxLength={500}
            value={itemNote?.note ?? ''}
            onChange={(event) =>
              setItemNote((current) => (current ? { ...current, note: event.target.value } : null))
            }
          />
          <AppButton
            disabled={!itemNote || (itemNote.cancel && !itemNote.note.trim())}
            loading={updateItem.isPending || close.isPending}
            onClick={() => {
              if (!itemNote) return;
              const options = {
                onSuccess: () => {
                  setItemNote(null);
                  setConfirm(null);
                },
                onError: fail('Kaydedilemedi'),
              };
              if (itemNote.id === '__pending')
                close.mutate(
                  { cancelPending: true, cancellationReason: itemNote.note.trim() },
                  options,
                );
              else
                updateItem.mutate(
                  {
                    itemId: itemNote.id,
                    note: itemNote.note.trim(),
                    ...(itemNote.cancel ? { status: 'CANCELLED' as const } : {}),
                  },
                  options,
                );
            }}
          >
            Kaydet
          </AppButton>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm === 'close'}
        onOpenChange={(open) => !open && setConfirm(null)}
        tone="default"
        title="Protokol kapatılsın mı?"
        description="Tüm tetkikler sonuçlandı. Kapatılan protokol gerekirse yeniden açılabilir."
        confirmLabel="Kapat"
        loading={close.isPending}
        onConfirm={() =>
          close.mutate(false, {
            onSuccess: () => {
              setConfirm(null);
              toast.success('Protokol kapatıldı');
            },
            onError: fail('Kapatılamadı'),
          })
        }
      />
      <ConfirmDialog
        open={confirm === 'closePending'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Bekleyen tetkikler var"
        description={`${pending.map((item) => PROTOCOL_ITEM_LABELS[item.type]).join(', ')} henüz tamamlanmadı. Kapatırsanız bekleyenler iptal edilir.`}
        confirmLabel="Bekleyenleri iptal edip kapat"
        loading={close.isPending}
        onConfirm={() => {
          setConfirm(null);
          setItemNote({ id: '__pending', note: '', cancel: true });
        }}
      />
      <ConfirmDialog
        open={confirm === 'cancel'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Protokol iptal edilsin mi?"
        description="Bekleyen tetkikler iptal edilir; protokol iptal durumuna geçer."
        confirmLabel="İptal et"
        loading={cancel.isPending}
        onConfirm={() =>
          cancel.mutate(undefined, {
            onSuccess: () => {
              setConfirm(null);
              toast.success('Protokol iptal edildi');
            },
            onError: fail('İptal edilemedi'),
          })
        }
      />
    </>
  );
}
