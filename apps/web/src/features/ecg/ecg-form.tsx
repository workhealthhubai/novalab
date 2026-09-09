import { ECG_FINDINGS, type EcgRhythm } from '@osgb/shared-types';
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
import { FilterChip } from '@/design-system/filter-chip';
import { FormField } from '@/design-system/form-field';
import { SectionCard } from '@/design-system/section-card';
import { StatusBadge } from '@/design-system/status-badge';
import { formatDate } from '@/features/patients/patient-utils';
import { PatientPicker } from '@/features/protocols/patient-picker';
import { PROTOCOL_TYPE_LABELS } from '@/features/protocols/protocol-labels';
import { useProtocols } from '@/features/protocols/use-protocols';
import { toApiError } from '@/services/api-client';
import { type EcgFormValues, hasNumberErrors, numberError, suggest } from './ecg-form-values';
import { FLAG_LABELS, INTERPRETATION, INTERPRETATIONS, RHYTHM_LABELS, RHYTHMS } from './ecg-labels';

const NONE = '__none__';
const GROUPS = [...new Set(ECG_FINDINGS.map((f) => f.group))];

interface EcgFormProps {
  initial: EcgFormValues;
  lockPatient?: boolean;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (values: EcgFormValues) => void;
  onCancel: () => void;
}

function NumberField({
  id,
  label,
  unit,
  value,
  error,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  error: string | null;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <FormField id={id} label={`${label} (${unit})`} error={error ?? undefined} hint={hint}>
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className="tabular-nums"
      />
    </FormField>
  );
}

/** Measurements, rhythm, findings catalogue and interpretation with a live suggestion. */
export function EcgForm({
  initial,
  lockPatient = false,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: EcgFormProps) {
  const [v, setV] = useState<EcgFormValues>(initial);
  const set = (patch: Partial<EcgFormValues>) => setV((prev) => ({ ...prev, ...patch }));
  const protocols = useProtocols({ employeeId: v.patient?.id, pageSize: 20 }, Boolean(v.patient));
  const analysis = suggest(v);
  const invalid = hasNumberErrors(v);
  const canSubmit = Boolean(v.patient) && Boolean(v.date) && !invalid && !pending;
  const toggleFinding = (code: string) =>
    set({
      findings: v.findings.includes(code)
        ? v.findings.filter((c) => c !== code)
        : [...v.findings, code],
    });

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
      <SectionCard title="Kayıt bilgileri">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="ecg-patient" label="Hasta" required className="sm:col-span-2">
            <PatientPicker
              id="ecg-patient"
              value={v.patient}
              onChange={(p) => set({ patient: p, protocolId: null })}
              disabled={lockPatient}
            />
          </FormField>
          <FormField
            id="ecg-protocol"
            label="Protokol"
            hint="Seçilirse protokoldeki EKG kalemi tamamlanır ve nabız muayeneye işlenir."
            className="sm:col-span-2"
          >
            <Select
              value={v.protocolId ?? NONE}
              onValueChange={(val) => set({ protocolId: val === NONE ? null : val })}
              disabled={!v.patient}
            >
              <SelectTrigger id="ecg-protocol">
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
          <FormField id="ecg-date" label="Tarih" required>
            <DatePicker
              id="ecg-date"
              value={v.date}
              onChange={(date) => set({ date })}
              max={new Date()}
            />
          </FormField>
          <FormField id="ecg-time" label="Saat">
            <Input
              id="ecg-time"
              type="time"
              value={v.time}
              onChange={(e) => set({ time: e.target.value })}
            />
          </FormField>
          <FormField id="ecg-device" label="Cihaz" className="sm:col-span-2">
            <Input
              id="ecg-device"
              value={v.deviceName}
              onChange={(e) => set({ deviceName: e.target.value })}
              placeholder="Örn. Nihon Kohden ECG-2150"
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard
        title="Ölçümler"
        description="Cihaz raporundaki değerleri girin; boş alanlar değerlendirmeye katılmaz. QTc verilmezse QT ve hızdan Bazett ile hesaplanır."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            id="ecg-hr"
            label="Kalp hızı"
            unit="/dk"
            value={v.heartRate}
            error={numberError('heartRate', v.heartRate)}
            onChange={(heartRate) => set({ heartRate })}
          />
          <FormField id="ecg-rhythm" label="Ritim">
            <Select
              value={v.rhythm ?? NONE}
              onValueChange={(val) => set({ rhythm: val === NONE ? null : (val as EcgRhythm) })}
            >
              <SelectTrigger id="ecg-rhythm">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Belirtilmedi</SelectItem>
                {RHYTHMS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {RHYTHM_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <NumberField
            id="ecg-pr"
            label="PR"
            unit="ms"
            value={v.prInterval}
            error={numberError('prInterval', v.prInterval)}
            onChange={(prInterval) => set({ prInterval })}
          />
          <NumberField
            id="ecg-qrs"
            label="QRS"
            unit="ms"
            value={v.qrsDuration}
            error={numberError('qrsDuration', v.qrsDuration)}
            onChange={(qrsDuration) => set({ qrsDuration })}
          />
          <NumberField
            id="ecg-qt"
            label="QT"
            unit="ms"
            value={v.qtInterval}
            error={numberError('qtInterval', v.qtInterval)}
            onChange={(qtInterval) => set({ qtInterval })}
          />
          <NumberField
            id="ecg-qtc"
            label="QTc"
            unit="ms"
            value={v.qtcInterval}
            error={numberError('qtcInterval', v.qtcInterval)}
            onChange={(qtcInterval) => set({ qtcInterval })}
            hint={
              v.qtcInterval.trim() === '' && analysis.qtc !== null
                ? `Bazett: ${analysis.qtc} ms`
                : undefined
            }
          />
          <NumberField
            id="ecg-axis"
            label="Aks"
            unit="°"
            value={v.axis}
            error={numberError('axis', v.axis)}
            onChange={(axis) => set({ axis })}
          />
        </div>
        {analysis.flags.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Otomatik uyarılar">
            {analysis.flags.map((f) => (
              <li
                key={f}
                className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning"
              >
                {FLAG_LABELS[f]}
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>

      <SectionCard title="Bulgular" description="Cihazın veya hekimin saptadığı bulgular.">
        <div className="flex flex-col gap-3">
          {GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ECG_FINDINGS.filter((f) => f.group === group).map((f) => (
                  <FilterChip
                    key={f.code}
                    label={f.label}
                    active={v.findings.includes(f.code)}
                    onClick={() => toggleFinding(f.code)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Değerlendirme"
        actions={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Öneri:{' '}
            <StatusBadge
              status={INTERPRETATION[analysis.suggested].status}
              label={INTERPRETATION[analysis.suggested].label}
            />
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Yorum" className="flex flex-wrap gap-2">
            {INTERPRETATIONS.map((i) => (
              <label
                key={i}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40"
              >
                <input
                  type="radio"
                  name="interpretation"
                  value={i}
                  checked={(v.interpretation ?? analysis.suggested) === i}
                  onChange={() => set({ interpretation: i })}
                  className="accent-primary"
                />
                {INTERPRETATION[i].label}
              </label>
            ))}
            {v.interpretation && v.interpretation !== analysis.suggested ? (
              <span className="self-center text-xs text-muted-foreground">
                Öneriden farklı; yorum satırında gerekçe belirtin.
              </span>
            ) : null}
          </div>
          <div>
            <Label htmlFor="ecg-comment" className="mb-1.5 block text-sm">
              Hekim yorumu
            </Label>
            <Textarea
              id="ecg-comment"
              rows={3}
              value={v.comment}
              onChange={(e) => set({ comment: e.target.value })}
              placeholder="Klinik değerlendirme, öneri, sevk…"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="ecg-clear"
              checked={v.interpretation === null}
              onCheckedChange={(c) =>
                set({ interpretation: c === true ? null : analysis.suggested })
              }
            />
            <Label htmlFor="ecg-clear" className="text-sm font-normal">
              Otomatik öneriyi kullan
            </Label>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <AppButton variant="secondary" onClick={onCancel} disabled={pending}>
          Vazgeç
        </AppButton>
        <AppButton onClick={() => onSubmit(v)} disabled={!canSubmit} loading={pending}>
          {submitLabel}
        </AppButton>
      </div>
    </div>
  );
}
