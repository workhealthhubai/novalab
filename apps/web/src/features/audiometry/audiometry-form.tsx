import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { SectionCard } from '@/design-system/section-card';
import { formatDate } from '@/features/patients/patient-utils';
import { PatientPicker } from '@/features/protocols/patient-picker';
import { PROTOCOL_TYPE_LABELS } from '@/features/protocols/protocol-labels';
import { useProtocols } from '@/features/protocols/use-protocols';
import { toApiError } from '@/services/api-client';
import { AudiogramChart } from './audiogram-chart';
import { draftError, draftIsEmpty, fromDraft, type ThresholdDraft } from './threshold-draft';
import { ThresholdGrid } from './threshold-grid';
import type { AudiometryFormValues } from './audiometry-form-values';

const NONE = '__none__';
function hasErrors(draft: ThresholdDraft): boolean {
  return Object.values(draft).some((v) => draftError(v) !== null);
}

interface AudiometryFormProps {
  initial: AudiometryFormValues;
  /** Editing an existing test: the patient cannot change. */
  lockPatient?: boolean;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (values: AudiometryFormValues) => void;
  onCancel: () => void;
}

/** Patient/protocol header, threshold grid with a live audiogram, conditions and notes. */
export function AudiometryForm({
  initial,
  lockPatient = false,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: AudiometryFormProps) {
  const [v, setV] = useState<AudiometryFormValues>(initial);
  const set = (patch: Partial<AudiometryFormValues>) => setV((prev) => ({ ...prev, ...patch }));
  const protocols = useProtocols({ employeeId: v.patient?.id, pageSize: 20 }, Boolean(v.patient));
  const invalid =
    hasErrors(v.airRight) ||
    hasErrors(v.airLeft) ||
    (v.bone && (hasErrors(v.boneRight) || hasErrors(v.boneLeft)));
  const empty = draftIsEmpty(v.airRight) && draftIsEmpty(v.airLeft);
  const quietInvalid =
    v.quietHours.trim() !== '' &&
    (!Number.isInteger(Number(v.quietHours)) || Number(v.quietHours) < 0);
  const canSubmit =
    Boolean(v.patient) && Boolean(v.date) && !invalid && !empty && !quietInvalid && !pending;

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
        >
          {toApiError(error).message}
        </div>
      ) : null}
      <SectionCard title="Test bilgileri">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="au-patient" label="Hasta" required className="sm:col-span-2">
            <PatientPicker
              id="au-patient"
              value={v.patient}
              onChange={(p) => set({ patient: p, protocolId: null })}
              disabled={lockPatient}
            />
          </FormField>
          <FormField
            id="au-protocol"
            label="Protokol"
            hint="Seçilirse protokoldeki Odyometri kalemi tamamlanır ve ortalamalar muayeneye işlenir."
            className="sm:col-span-2"
          >
            <Select
              value={v.protocolId ?? NONE}
              onValueChange={(val) => set({ protocolId: val === NONE ? null : val })}
              disabled={!v.patient}
            >
              <SelectTrigger id="au-protocol">
                <SelectValue placeholder="Protokol seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Protokolsüz</SelectItem>
                {(protocols.data?.items ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.protocolNumber} · {PROTOCOL_TYPE_LABELS[p.type]} · {formatDate(p.openedAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="au-date" label="Tarih" required>
            <DatePicker
              id="au-date"
              value={v.date}
              onChange={(date) => set({ date })}
              max={new Date()}
            />
          </FormField>
          <FormField id="au-time" label="Saat">
            <Input
              id="au-time"
              type="time"
              value={v.time}
              onChange={(e) => set({ time: e.target.value })}
            />
          </FormField>
          <FormField id="au-device" label="Cihaz">
            <Input
              id="au-device"
              value={v.deviceName}
              onChange={(e) => set({ deviceName: e.target.value })}
              placeholder="Örn. Interacoustics AD226"
            />
          </FormField>
          <FormField
            id="au-quiet"
            label="Gürültüsüz süre (saat)"
            hint="Başlangıç testi için ≥ 14 saat önerilir."
            error={quietInvalid ? 'Tam sayı olmalı' : undefined}
          >
            <Input
              id="au-quiet"
              inputMode="numeric"
              value={v.quietHours}
              onChange={(e) => set({ quietHours: e.target.value })}
              aria-invalid={quietInvalid || undefined}
            />
          </FormField>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="au-baseline"
              checked={v.isBaseline}
              onCheckedChange={(c) => set({ isBaseline: c === true })}
            />
            <Label htmlFor="au-baseline" className="font-normal">
              Başlangıç (referans) testi — sonraki testlerdeki eşik kayması buna göre hesaplanır
            </Label>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="İşitme eşikleri"
        description="Hava yolu eşikleri zorunludur; kemik yolu isteğe bağlıdır. Boş hücre: ölçülmedi / yanıt yok. 5 dB adımlarla girin."
        actions={
          <div className="flex items-center gap-2">
            <Checkbox
              id="au-bone"
              checked={v.bone}
              onCheckedChange={(c) => set({ bone: c === true })}
            />
            <Label htmlFor="au-bone" className="text-sm font-normal">
              Kemik yolu ölçüldü
            </Label>
          </div>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <ThresholdGrid
            disabled={pending}
            rows={[
              {
                key: 'ar',
                label: 'Sağ hava',
                tone: 'right',
                draft: v.airRight,
                onChange: (d) => set({ airRight: d }),
              },
              {
                key: 'al',
                label: 'Sol hava',
                tone: 'left',
                draft: v.airLeft,
                onChange: (d) => set({ airLeft: d }),
              },
              ...(v.bone
                ? [
                    {
                      key: 'br',
                      label: 'Sağ kemik',
                      tone: 'right' as const,
                      draft: v.boneRight,
                      onChange: (d: ThresholdDraft) => set({ boneRight: d }),
                    },
                    {
                      key: 'bl',
                      label: 'Sol kemik',
                      tone: 'left' as const,
                      draft: v.boneLeft,
                      onChange: (d: ThresholdDraft) => set({ boneLeft: d }),
                    },
                  ]
                : []),
            ]}
          />
          <AudiogramChart
            airRight={invalid ? {} : fromDraft(v.airRight)}
            airLeft={invalid ? {} : fromDraft(v.airLeft)}
            boneRight={v.bone && !invalid ? fromDraft(v.boneRight) : null}
            boneLeft={v.bone && !invalid ? fromDraft(v.boneLeft) : null}
            className="w-full rounded-md border border-border bg-card"
          />
        </div>
        {empty ? (
          <p className="mt-2 text-xs text-warning">En az bir hava yolu eşiği girilmelidir.</p>
        ) : null}
      </SectionCard>

      <SectionCard title="Not">
        <Textarea
          aria-label="Not"
          rows={3}
          value={v.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Test koşulları, hastanın beyanı, kabin bilgisi…"
        />
      </SectionCard>

      <div className="flex justify-end gap-2">
        <AppButton variant="secondary" onClick={onCancel} disabled={pending}>
          Vazgeç
        </AppButton>
        <AppButton onClick={() => onSubmit(v)} disabled={!canSubmit} loading={pending}>
          {submitLabel}
        </AppButton>
      </div>
      {v.bone && draftIsEmpty(v.boneRight) && draftIsEmpty(v.boneLeft) ? (
        <p className="text-right text-xs text-muted-foreground">
          Kemik yolu hücreleri boşsa kaydedilmez.
        </p>
      ) : null}
    </div>
  );
}
