import type { RadiologyModality } from '@osgb/shared-types';
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
import { FormField } from '@/design-system/form-field';
import { PatientPicker } from '@/features/protocols/patient-picker';
import { toApiError } from '@/services/api-client';
import type { PatientListItem } from '@/types/patient';
import type { RadiologyRequest, StudySummary } from '@/types/radiology';
import { BODY_PART_SUGGESTIONS, MODALITIES, MODALITY_LABELS } from './radiology-labels';
import { useRadiologyMutations } from './use-radiology';

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: PatientListItem | null;
  /** When set, the request is created and this PACS study is linked to it right away. */
  study?: StudySummary | null;
  onCreated: (request: RadiologyRequest) => void;
}

function guessModality(study: StudySummary | null | undefined): RadiologyModality {
  const first = study?.modalities[0];
  return first && (MODALITIES as string[]).includes(first) ? (first as RadiologyModality) : 'CR';
}

/** Creates a radiology request; optionally links an incoming PACS study in the same step. */
export function NewRequestDialog({
  open,
  onOpenChange,
  patient = null,
  study = null,
  onCreated,
}: NewRequestDialogProps) {
  const { create, linkStudy } = useRadiologyMutations();
  const [selected, setSelected] = useState<PatientListItem | null>(patient);
  const [modality, setModality] = useState<RadiologyModality>(guessModality(study));
  const [bodyPart, setBodyPart] = useState(study?.description ?? '');
  const [clinicalInfo, setClinicalInfo] = useState('');
  const [seed, setSeed] = useState({ open, patient, study });
  if (seed.open !== open || seed.patient !== patient || seed.study !== study) {
    setSeed({ open, patient, study });
    if (open) {
      setSelected(patient);
      setModality(guessModality(study));
      setBodyPart(study?.description ?? '');
      setClinicalInfo('');
      create.reset();
      linkStudy.reset();
    }
  }
  const pending = create.isPending || linkStudy.isPending;
  const error = create.error ?? linkStudy.error;

  const submit = async () => {
    if (!selected) return;
    try {
      const request = await create.mutateAsync({
        employeeId: selected.id,
        modality,
        ...(bodyPart.trim() ? { bodyPart: bodyPart.trim() } : {}),
        ...(clinicalInfo.trim() ? { clinicalInfo: clinicalInfo.trim() } : {}),
      });
      const final = study
        ? await linkStudy.mutateAsync({ id: request.id, studyInstanceUid: study.studyInstanceUid })
        : request;
      onCreated(final);
      onOpenChange(false);
    } catch {
      // surfaced through the mutation error below
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>{study ? 'Çalışmayı isteğe bağla' : 'Yeni radyoloji isteği'}</DialogTitle>
          <DialogDescription>
            {study
              ? `PACS'taki "${study.description ?? study.studyInstanceUid}" çalışması için istek oluşturulur ve çalışma bağlanır.`
              : 'İstek oluşturulduktan sonra çekim yapıldığında PACS çalışması isteğe bağlanır.'}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
          >
            {toApiError(error).message}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="rr-patient" label="Hasta" required className="sm:col-span-2">
            <PatientPicker
              id="rr-patient"
              value={selected}
              onChange={setSelected}
              disabled={patient !== null}
            />
          </FormField>
          <FormField id="rr-modality" label="Modalite" required>
            <Select value={modality} onValueChange={(v) => setModality(v as RadiologyModality)}>
              <SelectTrigger id="rr-modality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODALITIES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MODALITY_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="rr-body" label="Bölge / tetkik">
            <Input
              id="rr-body"
              list="rr-body-suggestions"
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              placeholder="Örn. Akciğer PA"
            />
            <datalist id="rr-body-suggestions">
              {BODY_PART_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </FormField>
          <FormField
            id="rr-clinical"
            label="Klinik bilgi"
            className="sm:col-span-2"
            hint="Radyoloğa iletilecek ön bilgi (tıbbi veri)."
          >
            <Textarea
              id="rr-clinical"
              rows={3}
              value={clinicalInfo}
              onChange={(e) => setClinicalInfo(e.target.value)}
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2">
          <AppButton variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Vazgeç
          </AppButton>
          <AppButton onClick={() => void submit()} disabled={!selected} loading={pending}>
            {study ? 'Oluştur ve bağla' : 'İstek oluştur'}
          </AppButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
