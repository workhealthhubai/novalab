import { FileUp } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppButton } from '@/design-system/app-button';
import { ErrorState } from '@/design-system/error-state';
import { FormField } from '@/design-system/form-field';
import { LoadingState } from '@/design-system/loading-state';
import { CONSENT_TYPE_LABELS } from '@/features/consents/consent-labels';
import { toApiError } from '@/services/api-client';
import type { PatientListItem } from '@/types/patient';
import type { DocumentSignature } from '@/types/signature';
import { SignaturePadField } from './signature-pad';
import { useConsentForm, useSignatureMutations } from './use-signatures';

function fullName(p: PatientListItem) {
  return `${p.firstName} ${p.lastName}`;
}

function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
    >
      {toApiError(error).message}
    </div>
  );
}

interface SignConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientListItem | null;
  templateId: string | null;
  onSigned: (signature: DocumentSignature) => void;
}

/** The patient reads the filled consent text and signs on the pad; the API renders and stores the PDF. */
export function SignConsentDialog({
  open,
  onOpenChange,
  patient,
  templateId,
  onSigned,
}: SignConsentDialogProps) {
  const form = useConsentForm(open ? templateId : null);
  const { signConsent } = useSignatureMutations();
  const [signerName, setSignerName] = useState(patient ? fullName(patient) : '');
  const [signature, setSignature] = useState<string | null>(null);
  const [read, setRead] = useState(false);
  const [seed, setSeed] = useState({ open, patient, templateId });
  if (seed.open !== open || seed.patient !== patient || seed.templateId !== templateId) {
    setSeed({ open, patient, templateId });
    if (open) {
      setSignerName(patient ? fullName(patient) : '');
      setSignature(null);
      setRead(false);
      signConsent.reset();
    }
  }
  const canSubmit =
    Boolean(patient && templateId && signature && read && signerName.trim().length >= 2) &&
    !signConsent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[820px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {form.data ? `${form.data.title} · v${form.data.version}` : 'Rıza metni imzala'}
          </DialogTitle>
          <DialogDescription>
            {patient ? `${fullName(patient)} · ` : ''}
            {form.data ? CONSENT_TYPE_LABELS[form.data.type] : ''} — metni hastaya okutun, ardından
            imza alın. İmzalı PDF hastanın belgelerine eklenir ve rıza "verildi" olarak kaydedilir.
          </DialogDescription>
        </DialogHeader>
        <ErrorBanner error={signConsent.error} />
        {form.isPending ? <LoadingState title="Metin yükleniyor…" className="min-h-40" /> : null}
        {form.error ? <ErrorState onRetry={() => void form.refetch()} /> : null}
        {form.data ? (
          <div className="scrollbar-subtle max-h-64 overflow-y-auto rounded-md border border-border bg-muted/40 p-4 text-sm leading-6 whitespace-pre-wrap">
            <p className="mb-2 text-xs text-muted-foreground">{form.data.organizationName}</p>
            {form.data.body}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-4">
            <FormField id="sc-signer" label="İmzalayan" required>
              <Input
                id="sc-signer"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </FormField>
            <div className="flex items-start gap-2">
              <Checkbox
                id="sc-read"
                checked={read}
                onCheckedChange={(v) => setRead(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="sc-read" className="text-sm leading-5 font-normal">
                Metin hastaya okutuldu / okundu ve soruları yanıtlandı.
              </Label>
            </div>
          </div>
          <SignaturePadField id="sc-pad" onChange={setSignature} disabled={signConsent.isPending} />
        </div>
        <div className="flex justify-end gap-2">
          <AppButton
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={signConsent.isPending}
          >
            Vazgeç
          </AppButton>
          <AppButton
            disabled={!canSubmit}
            loading={signConsent.isPending}
            onClick={() =>
              patient &&
              templateId &&
              signature &&
              signConsent.mutate(
                { employeeId: patient.id, templateId, signerName: signerName.trim(), signature },
                {
                  onSuccess: (s) => {
                    onSigned(s);
                    onOpenChange(false);
                  },
                },
              )
            }
          >
            İmzayı Kaydet
          </AppButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SignUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientListItem | null;
  onSigned: (signature: DocumentSignature) => void;
}

/** Any PDF (printed form, report) gets the signature block stamped on its last page. */
export function SignUploadDialog({ open, onOpenChange, patient, onSigned }: SignUploadDialogProps) {
  const { signUpload } = useSignatureMutations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [signerName, setSignerName] = useState(patient ? fullName(patient) : '');
  const [signature, setSignature] = useState<string | null>(null);
  const [seed, setSeed] = useState({ open, patient });
  if (seed.open !== open || seed.patient !== patient) {
    setSeed({ open, patient });
    if (open) {
      setFile(null);
      setTitle('');
      setSignerName(patient ? fullName(patient) : '');
      setSignature(null);
      signUpload.reset();
    }
  }
  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    if (next && !title.trim()) setTitle(next.name.replace(/\.pdf$/i, ''));
    event.target.value = '';
  };
  const canSubmit =
    Boolean(
      patient && file && signature && title.trim().length >= 2 && signerName.trim().length >= 2,
    ) && !signUpload.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>PDF yükle ve imzalat</DialogTitle>
          <DialogDescription>
            {patient ? `${fullName(patient)} · ` : ''}İmza bloğu PDF'in son sayfasının altına
            eklenir; belge hastanın belgelerinde "İmzalı form" olarak saklanır.
          </DialogDescription>
        </DialogHeader>
        <ErrorBanner error={signUpload.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="su-file" label="PDF dosyası" required className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={inputRef}
                id="su-file"
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={pick}
              />
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => inputRef.current?.click()}
                disabled={signUpload.isPending}
              >
                <FileUp />
                Dosya seç
              </AppButton>
              <span className="text-sm text-muted-foreground">
                {file
                  ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB`
                  : 'En fazla 25 MB, yalnızca PDF'}
              </span>
            </div>
          </FormField>
          <FormField id="su-title" label="Belge adı" required>
            <Input
              id="su-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn. İşe giriş muayene formu"
            />
          </FormField>
          <FormField id="su-signer" label="İmzalayan" required>
            <Input
              id="su-signer"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
          </FormField>
          <SignaturePadField
            id="su-pad"
            className="sm:col-span-2"
            onChange={setSignature}
            disabled={signUpload.isPending}
          />
        </div>
        <div className="flex justify-end gap-2">
          <AppButton
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={signUpload.isPending}
          >
            Vazgeç
          </AppButton>
          <AppButton
            disabled={!canSubmit}
            loading={signUpload.isPending}
            onClick={() =>
              patient &&
              file &&
              signature &&
              signUpload.mutate(
                {
                  file,
                  employeeId: patient.id,
                  title: title.trim(),
                  signerName: signerName.trim(),
                  signature,
                },
                {
                  onSuccess: (s) => {
                    onSigned(s);
                    onOpenChange(false);
                  },
                },
              )
            }
          >
            İmzayı Kaydet
          </AppButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
