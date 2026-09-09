import type { ConsentMethod, ConsentType } from '@osgb/shared-types';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AppButton } from '@/design-system/app-button';
import { DatePicker } from '@/design-system/date-picker';
import { FormField } from '@/design-system/form-field';
import { PatientPicker } from '@/features/protocols/patient-picker';
import { toApiError } from '@/services/api-client';
import type { PatientListItem } from '@/types/patient';
import type { ConsentTemplate } from '@/types/consent';
import { CONSENT_METHOD_LABELS, CONSENT_TYPE_LABELS, CONSENT_TYPES } from './consent-labels';
import { useConsentMutations } from './use-consents';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fills type, title and body from the version being superseded. */
  base?: ConsentTemplate | null;
  onPublished: (template: ConsentTemplate) => void;
}

/** Publishes a new immutable version of a consent text. */
export function PublishTemplateDialog({
  open,
  onOpenChange,
  base = null,
  onPublished,
}: PublishDialogProps) {
  const { publish } = useConsentMutations();
  const [type, setType] = useState<ConsentType>(base?.type ?? 'DISCLOSURE');
  const [title, setTitle] = useState(base?.title ?? '');
  const [body, setBody] = useState(base?.body ?? '');
  const [seed, setSeed] = useState<{ open: boolean; base: ConsentTemplate | null }>({ open, base });
  if (seed.open !== open || seed.base !== base) {
    setSeed({ open, base });
    if (open) {
      setType(base?.type ?? 'DISCLOSURE');
      setTitle(base?.title ?? '');
      setBody(base?.body ?? '');
      publish.reset();
    }
  }
  const error = publish.error ? toApiError(publish.error) : null;
  const valid = title.trim().length >= 3 && body.trim().length >= 20;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {base
              ? `Yeni sürüm · ${CONSENT_TYPE_LABELS[base.type]} v${base.version + 1}`
              : 'Yeni rıza metni'}
          </DialogTitle>
          <DialogDescription>
            Sürümler değiştirilemez; yayınlanan metin önceki sürümün yerine geçer, alınmış rızalar
            eski sürüme bağlı kalır ve "Eski sürüm" olarak görünür.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
          >
            {error.message}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="ct-type" label="Tür" required>
            <Select
              value={type}
              onValueChange={(v) => setType(v as ConsentType)}
              disabled={base !== null}
            >
              <SelectTrigger id="ct-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONSENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CONSENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="ct-title" label="Başlık" required className="sm:col-span-2">
            <Input id="ct-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField
            id="ct-body"
            label="Metin"
            required
            className="sm:col-span-3"
            hint="Düz metin; {{KURUM_ADI}} ve {{KURUM_ILETISIM}} yer tutucuları basımda Kurum Bilgileri'nden doldurulur."
          >
            <Textarea
              id="ct-body"
              rows={14}
              className="font-mono text-xs leading-5"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2">
          <AppButton
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={publish.isPending}
          >
            Vazgeç
          </AppButton>
          <AppButton
            disabled={!valid}
            loading={publish.isPending}
            onClick={() =>
              publish.mutate(
                { type, title: title.trim(), body: body.trim() },
                {
                  onSuccess: (t) => {
                    onPublished(t);
                    onOpenChange(false);
                  },
                },
              )
            }
          >
            Sürümü Yayınla
          </AppButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface GiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: PatientListItem | null;
  /** Restricts the dialog to one type (from the patient card). */
  type?: ConsentType;
  templates: ConsentTemplate[];
  onGiven: () => void;
}

/** Records a patient's consent to the version in force. */
export function GiveConsentDialog({
  open,
  onOpenChange,
  patient = null,
  type,
  templates,
  onGiven,
}: GiveDialogProps) {
  const { give } = useConsentMutations();
  const [selected, setSelected] = useState<PatientListItem | null>(patient);
  const [consentType, setConsentType] = useState<ConsentType>(type ?? 'DISCLOSURE');
  const [method, setMethod] = useState<ConsentMethod>('PAPER');
  const [givenAt, setGivenAt] = useState('');
  const [note, setNote] = useState('');
  const [seed, setSeed] = useState({ open, patient, type });
  if (seed.open !== open || seed.patient !== patient || seed.type !== type) {
    setSeed({ open, patient, type });
    if (open) {
      setSelected(patient);
      setConsentType(type ?? 'DISCLOSURE');
      setMethod('PAPER');
      setGivenAt('');
      setNote('');
      give.reset();
    }
  }
  const active = templates.find((t) => t.type === consentType && t.isActive) ?? null;
  const error = give.error ? toApiError(give.error) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>Rıza kaydet</DialogTitle>
          <DialogDescription>
            Hastanın metni okuyup onayladığını kaydeder. Yürürlükteki sürüme bağlanır; imzalı belge
            Belge İmza ekranından eklenecek.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
          >
            {error.message}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="gc-patient" label="Hasta" required className="sm:col-span-2">
            <PatientPicker
              id="gc-patient"
              value={selected}
              onChange={setSelected}
              disabled={patient !== null}
            />
          </FormField>
          <FormField
            id="gc-type"
            label="Metin"
            required
            hint={
              active ? `v${active.version} · ${active.title}` : 'Bu tür için yayınlanmış metin yok'
            }
          >
            <Select
              value={consentType}
              onValueChange={(v) => setConsentType(v as ConsentType)}
              disabled={type !== undefined}
            >
              <SelectTrigger id="gc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONSENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CONSENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="gc-method" label="Alınma yöntemi" required>
            <Select value={method} onValueChange={(v) => setMethod(v as ConsentMethod)}>
              <SelectTrigger id="gc-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CONSENT_METHOD_LABELS) as ConsentMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {CONSENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="gc-date" label="Tarih" hint="Boş bırakılırsa şimdi">
            <DatePicker id="gc-date" value={givenAt} onChange={setGivenAt} max={new Date()} />
          </FormField>
          <FormField id="gc-note" label="Not">
            <Input
              id="gc-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn. form no, tanık"
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2">
          <AppButton
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={give.isPending}
          >
            Vazgeç
          </AppButton>
          <AppButton
            disabled={!selected || !active}
            loading={give.isPending}
            onClick={() =>
              selected &&
              active &&
              give.mutate(
                {
                  employeeId: selected.id,
                  templateId: active.id,
                  method,
                  ...(givenAt ? { givenAt: `${givenAt}T12:00:00.000Z` } : {}),
                  note: note.trim() || null,
                },
                {
                  onSuccess: () => {
                    onGiven();
                    onOpenChange(false);
                  },
                },
              )
            }
          >
            Kaydet
          </AppButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
