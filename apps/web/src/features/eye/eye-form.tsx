import { ACUITY_STEPS, type ColorVisionResult, type VisualFieldResult } from '@osgb/shared-types';
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
  type AcuityField,
  acuityError,
  analyze,
  type EyeFormValues,
  formErrors,
  isEmpty,
  jaegerError,
} from './eye-form-values';
import {
  COLOR_VISION_LABELS,
  FLAG_LABELS,
  RECOMMENDATION,
  RECOMMENDATIONS,
  VISUAL_FIELD_LABELS,
} from './eye-labels';

const NONE = '__none__';

interface EyeFormProps {
  initial: EyeFormValues;
  lockPatient?: boolean;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (values: EyeFormValues) => void;
  onCancel: () => void;
}

/** Acuity grid (distance / corrected / near), colour vision, visual field and recommendation. */
export function EyeForm({
  initial,
  lockPatient = false,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: EyeFormProps) {
  const [v, setV] = useState<EyeFormValues>(initial);
  const set = (patch: Partial<EyeFormValues>) => setV((prev) => ({ ...prev, ...patch }));
  const protocols = useProtocols({ employeeId: v.patient?.id, pageSize: 20 }, Boolean(v.patient));
  const errors = formErrors(v);
  const analysis = analyze(v);
  const canSubmit =
    Boolean(v.patient) && Boolean(v.date) && errors.length === 0 && !isEmpty(v) && !pending;

  const acuityInput = (field: AcuityField, label: string) => {
    const err = acuityError(v[field]);
    const listId = `eye-${field}-steps`;
    return (
      <FormField id={`eye-${field}`} label={label} error={err ?? undefined}>
        <Input
          id={`eye-${field}`}
          list={listId}
          inputMode="decimal"
          placeholder="0,8 veya 6/7,5"
          value={v[field]}
          onChange={(e) => set({ [field]: e.target.value })}
          aria-invalid={err ? true : undefined}
          className="tabular-nums"
        />
        <datalist id={listId}>
          {ACUITY_STEPS.map((s) => (
            <option key={s} value={String(s)} />
          ))}
        </datalist>
      </FormField>
    );
  };
  const jaegerInput = (field: 'nearRight' | 'nearLeft', label: string) => {
    const err = jaegerError(v[field]);
    return (
      <FormField id={`eye-${field}`} label={label} hint="Jaeger 1–10" error={err ?? undefined}>
        <Input
          id={`eye-${field}`}
          inputMode="numeric"
          placeholder="1"
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
      <SectionCard title="Muayene bilgileri">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="eye-patient" label="Hasta" required className="sm:col-span-2">
            <PatientPicker
              id="eye-patient"
              value={v.patient}
              onChange={(p) => set({ patient: p, protocolId: null })}
              disabled={lockPatient}
            />
          </FormField>
          <FormField
            id="eye-protocol"
            label="Protokol"
            hint="Seçilirse protokoldeki Göz kalemi tamamlanır ve görme keskinliği muayeneye işlenir."
            className="sm:col-span-2"
          >
            <Select
              value={v.protocolId ?? NONE}
              onValueChange={(val) => set({ protocolId: val === NONE ? null : val })}
              disabled={!v.patient}
            >
              <SelectTrigger id="eye-protocol">
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
          <FormField id="eye-date" label="Tarih" required>
            <DatePicker
              id="eye-date"
              value={v.date}
              onChange={(date) => set({ date })}
              max={new Date()}
            />
          </FormField>
          <FormField id="eye-time" label="Saat">
            <Input
              id="eye-time"
              type="time"
              value={v.time}
              onChange={(e) => set({ time: e.target.value })}
            />
          </FormField>
          <div className="flex items-center gap-2 self-end pb-2">
            <Checkbox
              id="eye-glasses"
              checked={v.usesGlasses}
              onCheckedChange={(c) =>
                set({ usesGlasses: c === true, corrected: v.corrected || c === true })
              }
            />
            <Label htmlFor="eye-glasses" className="text-sm font-normal">
              Gözlük kullanıyor
            </Label>
          </div>
          <div className="flex items-center gap-2 self-end pb-2">
            <Checkbox
              id="eye-lens"
              checked={v.usesContactLenses}
              onCheckedChange={(c) =>
                set({ usesContactLenses: c === true, corrected: v.corrected || c === true })
              }
            />
            <Label htmlFor="eye-lens" className="text-sm font-normal">
              Kontakt lens kullanıyor
            </Label>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Görme keskinliği"
        description="Uzak görme ondalık (1,0 = 6/6) ya da Snellen (6/12, 20/40) olarak girilebilir; yakın görme Jaeger numarası."
        actions={
          <div className="flex items-center gap-2">
            <Checkbox
              id="eye-corrected"
              checked={v.corrected}
              onCheckedChange={(c) => set({ corrected: c === true })}
            />
            <Label htmlFor="eye-corrected" className="text-sm font-normal">
              Düzeltmeli (gözlük/lens ile) ölçüldü
            </Label>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {acuityInput('farRight', 'Uzak sağ (düzeltmesiz)')}
          {acuityInput('farLeft', 'Uzak sol (düzeltmesiz)')}
          {v.corrected ? acuityInput('farRightCorrected', 'Uzak sağ (düzeltmeli)') : <div />}
          {v.corrected ? acuityInput('farLeftCorrected', 'Uzak sol (düzeltmeli)') : <div />}
          {jaegerInput('nearRight', 'Yakın sağ')}
          {jaegerInput('nearLeft', 'Yakın sol')}
        </div>
        {isEmpty(v) ? (
          <p className="mt-2 text-xs text-warning">
            En az bir gözün uzak görme değeri girilmelidir.
          </p>
        ) : null}
      </SectionCard>

      <SectionCard title="Renk görme ve görme alanı">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField
            id="eye-ish-correct"
            label="İshihara doğru"
            hint="Doğru okunan levha"
            error={
              errors.includes('ishiharaCorrect') ? 'Gösterilen levha sayısını aşamaz' : undefined
            }
          >
            <Input
              id="eye-ish-correct"
              inputMode="numeric"
              value={v.ishiharaCorrect}
              onChange={(e) => set({ ishiharaCorrect: e.target.value })}
              className="tabular-nums"
            />
          </FormField>
          <FormField
            id="eye-ish-total"
            label="İshihara gösterilen"
            hint="Genellikle 14, 24 veya 38"
          >
            <Input
              id="eye-ish-total"
              inputMode="numeric"
              value={v.ishiharaTotal}
              onChange={(e) => set({ ishiharaTotal: e.target.value })}
              className="tabular-nums"
            />
          </FormField>
          <FormField
            id="eye-color"
            label="Renk görme"
            hint={
              analysis.colorVisionSource === 'plates'
                ? `Levhalardan: ${COLOR_VISION_LABELS[analysis.colorVision]}`
                : 'Levha sayısı girilmezse doğrudan seçin'
            }
          >
            <Select
              value={v.colorVision}
              onValueChange={(val) => set({ colorVision: val as ColorVisionResult })}
              disabled={analysis.colorVisionSource === 'plates'}
            >
              <SelectTrigger id="eye-color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(COLOR_VISION_LABELS) as ColorVisionResult[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {COLOR_VISION_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="eye-field" label="Görme alanı (konfrontasyon)">
            <Select
              value={v.visualField}
              onValueChange={(val) => set({ visualField: val as VisualFieldResult })}
            >
              <SelectTrigger id="eye-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(VISUAL_FIELD_LABELS) as VisualFieldResult[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {VISUAL_FIELD_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            id="eye-findings"
            label="Dış göz / diğer bulgular"
            className="sm:col-span-2 lg:col-span-4"
          >
            <Textarea
              id="eye-findings"
              rows={2}
              value={v.findings}
              onChange={(e) => set({ findings: e.target.value })}
              placeholder="Konjonktiva, kornea, göz hareketleri, pterjium…"
            />
          </FormField>
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

      <SectionCard
        title="Sonuç"
        actions={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Öneri:{' '}
            <StatusBadge
              status={RECOMMENDATION[analysis.suggested].status}
              label={RECOMMENDATION[analysis.suggested].label}
            />
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Sonuç" className="flex flex-wrap gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40">
              <input
                type="radio"
                name="recommendation"
                checked={v.recommendation === null}
                onChange={() => set({ recommendation: null })}
                className="accent-primary"
              />
              Otomatik ({RECOMMENDATION[analysis.suggested].label})
            </label>
            {RECOMMENDATIONS.map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40"
              >
                <input
                  type="radio"
                  name="recommendation"
                  value={r}
                  checked={v.recommendation === r}
                  onChange={() => set({ recommendation: r })}
                  className="accent-primary"
                />
                {RECOMMENDATION[r].label}
              </label>
            ))}
          </div>
          <Textarea
            aria-label="Hekim yorumu"
            rows={3}
            value={v.comment}
            onChange={(e) => set({ comment: e.target.value })}
            placeholder="Değerlendirme, öneri, sevk gerekçesi…"
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
