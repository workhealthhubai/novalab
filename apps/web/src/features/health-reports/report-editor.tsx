import {
  type AlcoholHabit,
  BODY_SYSTEMS,
  EXPOSURES,
  type SmokingHabit,
  type SystemStatus,
} from '@osgb/shared-types';
import { CheckCheck } from 'lucide-react';
import { useState } from 'react';
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
import { FilterChip } from '@/design-system/filter-chip';
import { FormField } from '@/design-system/form-field';
import { SectionCard } from '@/design-system/section-card';
import { FITNESS_DECISION } from '@/features/examinations/examination-labels';
import { usePhysicians } from '@/features/physicians/use-physicians';
import { toApiError } from '@/services/api-client';
import { allNormal, type ReportFormValues } from './report-form-values';
import { ALCOHOL_LABELS, SMOKING_LABELS, SYSTEM_STATUS_LABELS } from './report-labels';
import { cn } from '@/lib/utils';

const NONE = '__none__';
const DECISIONS = ['FIT', 'FIT_WITH_RESTRICTIONS', 'UNFIT'] as const;

interface ReportEditorProps {
  initial: ReportFormValues;
  readOnly: boolean;
  pending: boolean;
  error: unknown;
  onSave: (values: ReportFormValues) => void;
}

/** Ek-2 sections A–E as an editable form; `readOnly` after approval. */
export function ReportEditor({ initial, readOnly, pending, error, onSave }: ReportEditorProps) {
  const [v, setV] = useState<ReportFormValues>(initial);
  const set = (patch: Partial<ReportFormValues>) => setV((prev) => ({ ...prev, ...patch }));
  const setA = (patch: Partial<ReportFormValues['anamnesis']>) =>
    setV((prev) => ({ ...prev, anamnesis: { ...prev.anamnesis, ...patch } }));
  const physicians = usePhysicians({ pageSize: 50, status: 'ACTIVE' });
  const textArea = (
    id: string,
    label: string,
    key: keyof ReportFormValues['anamnesis'],
    rows = 2,
  ) => (
    <FormField id={id} label={label}>
      <Textarea
        id={id}
        rows={rows}
        value={v.anamnesis[key] as string}
        onChange={(e) => setA({ [key]: e.target.value })}
        disabled={readOnly}
      />
    </FormField>
  );

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
      <SectionCard title="Muayene" description="Tarih ve raporu imzalayacak hekim.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="hr-date" label="Muayene tarihi" required>
            <DatePicker
              id="hr-date"
              value={v.date}
              onChange={(date) => set({ date })}
              max={new Date()}
              disabled={readOnly}
            />
          </FormField>
          <FormField id="hr-time" label="Saat">
            <Input
              id="hr-time"
              type="time"
              value={v.time}
              onChange={(e) => set({ time: e.target.value })}
              disabled={readOnly}
            />
          </FormField>
          <FormField
            id="hr-physician"
            label="Hekim"
            required
            hint="Doktor Tanımları'ndaki imza görseli rapora basılır."
            className="sm:col-span-2"
          >
            <Select
              value={v.physicianProfileId ?? NONE}
              onValueChange={(val) => set({ physicianProfileId: val === NONE ? null : val })}
              disabled={readOnly}
            >
              <SelectTrigger id="hr-physician">
                <SelectValue placeholder="Hekim seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Seçilmedi</SelectItem>
                {(physicians.data?.items ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {[p.title, p.firstName, p.lastName].filter(Boolean).join(' ')}
                    {p.specialty ? ` · ${p.specialty}` : ''}
                    {p.signatureUpdatedAt ? '' : ' · imza yok'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="A. Anamnez ve çalışma ortamı">
        <div className="grid gap-4 sm:grid-cols-2">
          {textArea('hr-complaints', 'Yakınma', 'complaints')}
          {textArea('hr-past', 'Geçirilmiş hastalıklar', 'pastIllnesses')}
          {textArea('hr-surgeries', 'Ameliyatlar', 'surgeries')}
          {textArea('hr-family', 'Soygeçmiş', 'familyHistory')}
          {textArea('hr-meds', 'Sürekli kullanılan ilaçlar', 'medications')}
          {textArea('hr-allergies', 'Alerji', 'allergies')}
          <FormField id="hr-smoking" label="Sigara">
            <div className="flex gap-2">
              <Select
                value={v.anamnesis.smoking ?? NONE}
                onValueChange={(val) =>
                  setA({ smoking: val === NONE ? null : (val as SmokingHabit) })
                }
                disabled={readOnly}
              >
                <SelectTrigger id="hr-smoking" className="flex-1">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Belirtilmedi</SelectItem>
                  {Object.entries(SMOKING_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {v.anamnesis.smoking && v.anamnesis.smoking !== 'NEVER' ? (
                <Input
                  aria-label="Paket-yıl"
                  inputMode="decimal"
                  placeholder="paket-yıl"
                  className="w-28"
                  value={v.anamnesis.packYears}
                  onChange={(e) => setA({ packYears: e.target.value })}
                  disabled={readOnly}
                />
              ) : null}
            </div>
          </FormField>
          <FormField id="hr-alcohol" label="Alkol">
            <Select
              value={v.anamnesis.alcohol ?? NONE}
              onValueChange={(val) =>
                setA({ alcohol: val === NONE ? null : (val as AlcoholHabit) })
              }
              disabled={readOnly}
            >
              <SelectTrigger id="hr-alcohol">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Belirtilmedi</SelectItem>
                {Object.entries(ALCOHOL_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="sm:col-span-2">
            {textArea('hr-occ', 'Çalışma öyküsü (önceki işler, süreler)', 'occupationalHistory', 3)}
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium">Maruziyetler</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Maruziyetler">
              {EXPOSURES.map((e) => (
                <FilterChip
                  key={e.key}
                  label={e.label}
                  active={v.anamnesis.exposures.includes(e.key)}
                  onClick={() =>
                    !readOnly &&
                    setA({
                      exposures: v.anamnesis.exposures.includes(e.key)
                        ? v.anamnesis.exposures.filter((k) => k !== e.key)
                        : [...v.anamnesis.exposures, e.key],
                    })
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="B. Fizik muayene"
        description="Sistem başına durum ve not. Vital bulgular ve ölçümler sağdaki karttan girilir."
        actions={
          readOnly ? null : (
            <AppButton
              size="sm"
              variant="ghost"
              onClick={() => set({ systems: allNormal(v.systems) })}
            >
              <CheckCheck />
              Bakılmayanları normal işaretle
            </AppButton>
          )
        }
      >
        <div className="scrollbar-subtle overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="w-52 pb-2 text-left font-semibold">Sistem</th>
                <th className="w-64 pb-2 text-left font-semibold">Durum</th>
                <th className="pb-2 text-left font-semibold">Bulgu / not</th>
              </tr>
            </thead>
            <tbody>
              {BODY_SYSTEMS.map((s) => {
                const f = v.systems[s.key];
                const abnormal = f.status === 'ABNORMAL';
                return (
                  <tr key={s.key} className="border-t border-border">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-foreground">
                      {s.label}
                    </th>
                    <td className="py-2 pr-3">
                      <div
                        role="radiogroup"
                        aria-label={s.label}
                        className="inline-flex rounded-md border border-border bg-muted/40 p-0.5"
                      >
                        {(['NORMAL', 'ABNORMAL', 'NOT_EXAMINED'] as SystemStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            role="radio"
                            aria-checked={f.status === st}
                            disabled={readOnly}
                            onClick={() =>
                              set({ systems: { ...v.systems, [s.key]: { ...f, status: st } } })
                            }
                            className={cn(
                              'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-offset-0 disabled:cursor-not-allowed',
                              f.status === st
                                ? st === 'ABNORMAL'
                                  ? 'bg-warning-soft text-warning shadow-sm'
                                  : st === 'NORMAL'
                                    ? 'bg-card text-success shadow-sm'
                                    : 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {SYSTEM_STATUS_LABELS[st] ?? st}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-2">
                      <Input
                        aria-label={`${s.label} notu`}
                        placeholder={abnormal ? 'Bulguyu yazın' : 'İsteğe bağlı not'}
                        value={f.note}
                        onChange={(e) =>
                          set({
                            systems: { ...v.systems, [s.key]: { ...f, note: e.target.value } },
                          })
                        }
                        disabled={readOnly}
                        aria-invalid={abnormal && f.note.trim() === '' ? true : undefined}
                        className="h-9"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <FormField id="hr-findings" label="Diğer bulgular" className="mt-4">
          <Textarea
            id="hr-findings"
            rows={3}
            value={v.findings}
            onChange={(e) => set({ findings: e.target.value })}
            disabled={readOnly}
          />
        </FormField>
      </SectionCard>

      <SectionCard title="E. Kanaat">
        <div className="flex flex-col gap-4">
          <div
            role="radiogroup"
            aria-label="Çalışabilirlik kararı"
            className="flex flex-wrap gap-2"
          >
            {DECISIONS.map((d) => (
              <label
                key={d}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40"
              >
                <input
                  type="radio"
                  name="decision"
                  value={d}
                  checked={v.fitnessDecision === d}
                  onChange={() => set({ fitnessDecision: d })}
                  disabled={readOnly}
                  className="accent-primary"
                />
                {FITNESS_DECISION[d].label}
              </label>
            ))}
          </div>
          {v.fitnessDecision === 'FIT_WITH_RESTRICTIONS' ? (
            <FormField id="hr-restrictions" label="Şartlar / kısıtlamalar" required>
              <Textarea
                id="hr-restrictions"
                rows={2}
                value={v.restrictions}
                onChange={(e) => set({ restrictions: e.target.value })}
                disabled={readOnly}
                placeholder="Örn. Yüksekte çalışamaz; gürültülü ortamda KKD zorunlu"
              />
            </FormField>
          ) : null}
          <FormField
            id="hr-conclusion"
            label="Sonuç / kanaat"
            required={v.fitnessDecision === 'UNFIT'}
          >
            <Textarea
              id="hr-conclusion"
              rows={3}
              value={v.conclusion}
              onChange={(e) => set({ conclusion: e.target.value })}
              disabled={readOnly}
            />
          </FormField>
          <FormField id="hr-next" label="Sonraki muayene tarihi" className="max-w-xs">
            <DatePicker
              id="hr-next"
              value={v.nextExaminationDue}
              onChange={(nextExaminationDue) => set({ nextExaminationDue })}
              min={new Date()}
              disabled={readOnly}
            />
          </FormField>
          <div className="flex items-center gap-2">
            {!readOnly ? (
              <AppButton
                id="hr-save"
                onClick={() => onSave(v)}
                loading={pending}
                disabled={!v.date}
              >
                Raporu Kaydet
              </AppButton>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
