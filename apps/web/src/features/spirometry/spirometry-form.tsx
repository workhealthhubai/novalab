import { type SmokingStatus } from '@osgb/shared-types';
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
import { StatusBadge } from '@/design-system/status-badge';
import { formatDate } from '@/features/patients/patient-utils';
import { PatientPicker } from '@/features/protocols/patient-picker';
import { PROTOCOL_TYPE_LABELS } from '@/features/protocols/protocol-labels';
import { useProtocols } from '@/features/protocols/use-protocols';
import { toApiError } from '@/services/api-client';
import {
  analyze,
  formErrors,
  isEmpty,
  type NumericField,
  numberError,
  type SpirometryFormValues,
} from './spirometry-form-values';
import {
  FLAG_LABELS,
  litres,
  PATTERN,
  PATTERNS,
  percent,
  SMOKING,
  SMOKING_LABELS,
} from './spirometry-labels';

const NONE = '__none__';

interface SpirometryFormProps {
  initial: SpirometryFormValues;
  lockPatient?: boolean;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (values: SpirometryFormValues) => void;
  onCancel: () => void;
}

/** Subject data, measured / predicted / post-BD values with a live interpretation. */
export function SpirometryForm({
  initial,
  lockPatient = false,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: SpirometryFormProps) {
  const [v, setV] = useState<SpirometryFormValues>(initial);
  const set = (patch: Partial<SpirometryFormValues>) => setV((prev) => ({ ...prev, ...patch }));
  const protocols = useProtocols({ employeeId: v.patient?.id, pageSize: 20 }, Boolean(v.patient));
  const errors = formErrors(v);
  const analysis = analyze(v);
  const canSubmit =
    Boolean(v.patient) && Boolean(v.date) && errors.length === 0 && !isEmpty(v) && !pending;
  const num = ({
    field,
    label,
    unit,
    hint,
  }: {
    field: NumericField;
    label: string;
    unit: string;
    hint?: string;
  }) => {
    const err =
      numberError(field, v[field]) ??
      (errors.includes(field)
        ? field === 'fev1'
          ? "FEV1, FVC'yi aşamaz"
          : "Post-BD FEV1, post-BD FVC'yi aşamaz"
        : null);
    return (
      <FormField
        id={`sp-${field}`}
        label={`${label} (${unit})`}
        error={err ?? undefined}
        hint={hint}
      >
        <Input
          id={`sp-${field}`}
          inputMode="decimal"
          value={v[field]}
          onChange={(e) => set({ [field]: e.target.value })}
          aria-invalid={err ? true : undefined}
          className="tabular-nums"
        />
      </FormField>
    );
  };

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
          <FormField id="sp-patient" label="Hasta" required className="sm:col-span-2">
            <PatientPicker
              id="sp-patient"
              value={v.patient}
              onChange={(p) => set({ patient: p, protocolId: null })}
              disabled={lockPatient}
            />
          </FormField>
          <FormField
            id="sp-protocol"
            label="Protokol"
            hint="Seçilirse protokoldeki Spirometri kalemi tamamlanır ve % beklenen değerler muayeneye işlenir."
            className="sm:col-span-2"
          >
            <Select
              value={v.protocolId ?? NONE}
              onValueChange={(val) => set({ protocolId: val === NONE ? null : val })}
              disabled={!v.patient}
            >
              <SelectTrigger id="sp-protocol">
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
          <FormField id="sp-date" label="Tarih" required>
            <DatePicker
              id="sp-date"
              value={v.date}
              onChange={(date) => set({ date })}
              max={new Date()}
            />
          </FormField>
          <FormField id="sp-time" label="Saat">
            <Input
              id="sp-time"
              type="time"
              value={v.time}
              onChange={(e) => set({ time: e.target.value })}
            />
          </FormField>
          <FormField id="sp-device" label="Cihaz">
            <Input
              id="sp-device"
              value={v.deviceName}
              onChange={(e) => set({ deviceName: e.target.value })}
              placeholder="Örn. MIR Spirolab"
            />
          </FormField>
          <FormField
            id="sp-quality"
            label="Kalite derecesi"
            hint="Cihazın kabul edilebilirlik notu (A–F)"
          >
            <Input
              id="sp-quality"
              maxLength={1}
              value={v.qualityGrade}
              onChange={(e) => set({ qualityGrade: e.target.value.toUpperCase() })}
              className="uppercase"
            />
          </FormField>
          {num({
            field: 'heightCm',
            label: 'Boy',
            unit: 'cm',
            hint: 'Beklenen değerler için gerekli',
          })}
          {num({ field: 'weightKg', label: 'Kilo', unit: 'kg' })}
          <FormField id="sp-smoking" label="Sigara">
            <Select
              value={v.smokingStatus ?? NONE}
              onValueChange={(val) =>
                set({ smokingStatus: val === NONE ? null : (val as SmokingStatus) })
              }
            >
              <SelectTrigger id="sp-smoking">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Belirtilmedi</SelectItem>
                {SMOKING.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SMOKING_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="flex items-center gap-2 self-end pb-2">
            <Checkbox
              id="sp-baseline"
              checked={v.isBaseline}
              onCheckedChange={(c) => set({ isBaseline: c === true })}
            />
            <Label htmlFor="sp-baseline" className="text-sm font-normal">
              Başlangıç (referans) testi
            </Label>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Ölçülen değerler"
        description="En iyi manevranın değerleri. FEV1/FVC boş bırakılırsa hesaplanır; beklenen değerler cihazdan girilmezse boy, yaş ve cinsiyetten (ECSC 1993) türetilir."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {num({ field: 'fvc', label: 'FVC', unit: 'L' })}
          {num({ field: 'fev1', label: 'FEV1', unit: 'L' })}
          {num({
            field: 'ratio',
            label: 'FEV1/FVC',
            unit: '%',
            hint:
              v.ratio.trim() === '' && analysis.ratio !== null
                ? `Hesaplanan: %${analysis.ratio}`
                : undefined,
          })}
          {num({ field: 'pef', label: 'PEF', unit: 'L/s' })}
          {num({ field: 'fef2575', label: 'FEF25–75', unit: 'L/s' })}
          {num({
            field: 'fvcPredicted',
            label: 'Beklenen FVC',
            unit: 'L',
            hint:
              v.fvcPredicted.trim() === '' && analysis.predicted.source === 'ecsc'
                ? `ECSC: ${litres(analysis.predicted.fvc)}`
                : undefined,
          })}
          {num({
            field: 'fev1Predicted',
            label: 'Beklenen FEV1',
            unit: 'L',
            hint:
              v.fev1Predicted.trim() === '' && analysis.predicted.source === 'ecsc'
                ? `ECSC: ${litres(analysis.predicted.fev1)}`
                : undefined,
          })}
          <div className="flex items-center gap-2 self-end pb-2">
            <Checkbox
              id="sp-bd"
              checked={v.bronchodilator}
              onCheckedChange={(c) => set({ bronchodilator: c === true })}
            />
            <Label htmlFor="sp-bd" className="text-sm font-normal">
              Bronkodilatör sonrası ölçüm yapıldı
            </Label>
          </div>
          {v.bronchodilator ? (
            <>
              {num({ field: 'postFvc', label: 'Post-BD FVC', unit: 'L' })}
              {num({ field: 'postFev1', label: 'Post-BD FEV1', unit: 'L' })}
            </>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            FVC {percent(analysis.fvcPercent)} · FEV1 {percent(analysis.fev1Percent)} beklenen
          </span>
          {analysis.pattern ? (
            <StatusBadge
              status={PATTERN[analysis.pattern].status}
              label={`Öneri: ${PATTERN[analysis.pattern].label}${analysis.severity ? ` · ${analysis.severity.label}` : ''}`}
            />
          ) : null}
        </div>
        {analysis.flags.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Otomatik uyarılar">
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
        {isEmpty(v) ? (
          <p className="mt-2 text-xs text-warning">FVC veya FEV1 girilmelidir.</p>
        ) : null}
      </SectionCard>

      <SectionCard title="Değerlendirme" description="Boş bırakılırsa otomatik patern kullanılır.">
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Patern" className="flex flex-wrap gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40">
              <input
                type="radio"
                name="pattern"
                checked={v.pattern === null}
                onChange={() => set({ pattern: null })}
                className="accent-primary"
              />
              Otomatik{analysis.pattern ? ` (${PATTERN[analysis.pattern].label})` : ''}
            </label>
            {PATTERNS.map((p) => (
              <label
                key={p}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40"
              >
                <input
                  type="radio"
                  name="pattern"
                  value={p}
                  checked={v.pattern === p}
                  onChange={() => set({ pattern: p })}
                  className="accent-primary"
                />
                {PATTERN[p].label}
              </label>
            ))}
          </div>
          <Textarea
            aria-label="Hekim yorumu"
            rows={3}
            value={v.comment}
            onChange={(e) => set({ comment: e.target.value })}
            placeholder="Klinik değerlendirme, öneri, sevk…"
          />
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
