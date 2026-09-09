import {
  FILM_QUALITIES,
  ILO_SYMBOLS,
  LARGE_OPACITIES,
  LUNG_ZONE_LABELS,
  LUNG_ZONES,
  OPACITY_SHAPES,
  PROFUSIONS,
} from '@osgb/shared-types';
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
import { formatDate, formatDateTime } from '@/features/patients/patient-utils';
import { PatientPicker } from '@/features/protocols/patient-picker';
import { PROTOCOL_TYPE_LABELS } from '@/features/protocols/protocol-labels';
import { useProtocols } from '@/features/protocols/use-protocols';
import { useRadiologyRequests } from '@/features/radiology/use-radiology';
import { toApiError } from '@/services/api-client';
import { analyze, formErrors, type PneumoFormValues } from './pneumoconiosis-form-values';
import {
  FLAG_LABELS,
  LARGE_OPACITY_LABELS,
  RESULT,
  RESULTS,
  SHAPE_LABELS,
} from './pneumoconiosis-labels';

const NONE = '__none__';

interface PneumoFormProps {
  initial: PneumoFormValues;
  lockPatient?: boolean;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (values: PneumoFormValues) => void;
  onCancel: () => void;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** ILO 2011 reading sheet: film, parenchymal and pleural sections, symbols and the result. */
export function PneumoconiosisForm({
  initial,
  lockPatient = false,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: PneumoFormProps) {
  const [v, setV] = useState<PneumoFormValues>(initial);
  const set = (patch: Partial<PneumoFormValues>) => setV((prev) => ({ ...prev, ...patch }));
  const protocols = useProtocols({ employeeId: v.patient?.id, pageSize: 20 }, Boolean(v.patient));
  const films = useRadiologyRequests({ employeeId: v.patient?.id ?? '', pageSize: 20 });
  const errors = formErrors(v);
  const analysis = analyze(v);
  const unreadable = v.filmQuality === 4;
  const canSubmit = Boolean(v.patient) && Boolean(v.date) && errors.length === 0 && !pending;

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
      <SectionCard title="Okuma bilgileri">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="pn-patient" label="Hasta" required className="sm:col-span-2">
            <PatientPicker
              id="pn-patient"
              value={v.patient}
              onChange={(p) => set({ patient: p, protocolId: null, radiologyRequestId: null })}
              disabled={lockPatient}
            />
          </FormField>
          <FormField
            id="pn-protocol"
            label="Protokol"
            hint="Seçilirse protokoldeki Pnömokonyoz kalemi tamamlanır."
            className="sm:col-span-2"
          >
            <Select
              value={v.protocolId ?? NONE}
              onValueChange={(val) => set({ protocolId: val === NONE ? null : val })}
              disabled={!v.patient}
            >
              <SelectTrigger id="pn-protocol">
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
          <FormField
            id="pn-film"
            label="Radyoloji isteği (film)"
            hint="Okunan akciğer grafisinin isteği"
            className="sm:col-span-2"
          >
            <Select
              value={v.radiologyRequestId ?? NONE}
              onValueChange={(val) => set({ radiologyRequestId: val === NONE ? null : val })}
              disabled={!v.patient}
            >
              <SelectTrigger id="pn-film">
                <SelectValue placeholder="İstek seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Bağlanmadı</SelectItem>
                {(v.patient ? (films.data?.items ?? []) : []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {formatDateTime(r.requestedAt)} · {r.modality} {r.bodyPart ?? ''}{' '}
                    {r.studyInstanceUid ? '· PACS' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="pn-date" label="Okuma tarihi" required>
            <DatePicker
              id="pn-date"
              value={v.date}
              onChange={(date) => set({ date })}
              max={new Date()}
            />
          </FormField>
          <FormField id="pn-time" label="Saat">
            <Input
              id="pn-time"
              type="time"
              value={v.time}
              onChange={(e) => set({ time: e.target.value })}
            />
          </FormField>
          <FormField id="pn-reader" label="Okuyucu rolü" hint="Örn. A okuyucu, B okuyucu">
            <Input
              id="pn-reader"
              value={v.readerRole}
              onChange={(e) => set({ readerRole: e.target.value })}
            />
          </FormField>
          <FormField id="pn-filmdate" label="Film tarihi">
            <DatePicker
              id="pn-filmdate"
              value={v.filmDate}
              onChange={(filmDate) => set({ filmDate })}
              max={new Date()}
            />
          </FormField>
          <FormField id="pn-quality" label="Film kalitesi">
            <Select
              value={v.filmQuality === null ? NONE : String(v.filmQuality)}
              onValueChange={(val) => set({ filmQuality: val === NONE ? null : Number(val) })}
            >
              <SelectTrigger id="pn-quality">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Belirtilmedi</SelectItem>
                {FILM_QUALITIES.map((q) => (
                  <SelectItem key={q.value} value={String(q.value)}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        {v.filmQuality !== null && v.filmQuality >= 2 ? (
          <FormField id="pn-qcomment" label="Kalite kusuru" className="mt-4">
            <Input
              id="pn-qcomment"
              value={v.qualityComment}
              onChange={(e) => set({ qualityComment: e.target.value })}
              placeholder="Örn. eksik penetrasyon, hareket artefaktı"
            />
          </FormField>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Parankimal anormallikler"
        description={
          unreadable
            ? 'Film kabul edilemez kalitede; sınıflama yapılmaz.'
            : 'Küçük opasiteler: profüzyon (12 basamaklı), şekil/boyut ve tutulan zonlar. Büyük opasiteler: A/B/C.'
        }
      >
        <div className={unreadable ? 'pointer-events-none opacity-50' : ''}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField
              id="pn-profusion"
              label="Profüzyon"
              required
              error={errors.includes('profusion') ? 'Zorunlu' : undefined}
            >
              <Select
                value={v.profusion ?? NONE}
                onValueChange={(val) => set({ profusion: val === NONE ? null : val })}
              >
                <SelectTrigger
                  id="pn-profusion"
                  aria-invalid={errors.includes('profusion') || undefined}
                >
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Seçilmedi</SelectItem>
                  {PROFUSIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              id="pn-shape1"
              label="Birincil şekil"
              error={errors.includes('shapePrimary') ? 'Opasite varsa zorunlu' : undefined}
            >
              <Select
                value={v.shapePrimary ?? NONE}
                onValueChange={(val) => set({ shapePrimary: val === NONE ? null : val })}
              >
                <SelectTrigger
                  id="pn-shape1"
                  aria-invalid={errors.includes('shapePrimary') || undefined}
                >
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Yok</SelectItem>
                  {OPACITY_SHAPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SHAPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="pn-shape2" label="İkincil şekil">
              <Select
                value={v.shapeSecondary ?? NONE}
                onValueChange={(val) => set({ shapeSecondary: val === NONE ? null : val })}
              >
                <SelectTrigger id="pn-shape2">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Yok</SelectItem>
                  {OPACITY_SHAPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SHAPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="pn-large" label="Büyük opasite">
              <Select
                value={v.largeOpacity}
                onValueChange={(largeOpacity) => set({ largeOpacity })}
              >
                <SelectTrigger id="pn-large">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LARGE_OPACITIES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {LARGE_OPACITY_LABELS[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <p className="mt-4 mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Tutulan zonlar
          </p>
          <div
            className="grid max-w-xs grid-cols-2 gap-1.5"
            role="group"
            aria-label="Tutulan zonlar"
          >
            {LUNG_ZONES.map((z) => (
              <FilterChip
                key={z}
                label={LUNG_ZONE_LABELS[z]}
                active={v.zones.includes(z)}
                onClick={() => set({ zones: toggle(v.zones, z) })}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Plevral anormallikler ve semboller">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={v.pleuralPlaques}
              onCheckedChange={(c) => set({ pleuralPlaques: c === true })}
            />
            Plevral plak
          </label>
          {v.pleuralPlaques ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={v.plaqueCalcification}
                onCheckedChange={(c) => set({ plaqueCalcification: c === true })}
              />
              Plaklarda kalsifikasyon
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={v.diffuseThickening}
              onCheckedChange={(c) => set({ diffuseThickening: c === true })}
            />
            Diffüz plevral kalınlaşma
          </label>
          <span className="flex items-center gap-2 text-sm">
            Kostofrenik sinüs küntleşmesi:
            <FilterChip
              label="Sağ"
              active={v.costophrenicObliteration.includes('R')}
              onClick={() =>
                set({ costophrenicObliteration: toggle(v.costophrenicObliteration, 'R') })
              }
            />
            <FilterChip
              label="Sol"
              active={v.costophrenicObliteration.includes('L')}
              onClick={() =>
                set({ costophrenicObliteration: toggle(v.costophrenicObliteration, 'L') })
              }
            />
          </span>
        </div>
        <p className="mt-4 mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          ILO sembolleri
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="ILO sembolleri">
          {ILO_SYMBOLS.map((s) => (
            <FilterChip
              key={s.code}
              label={`${s.code} · ${s.label}`}
              active={v.symbols.includes(s.code)}
              onClick={() => set({ symbols: toggle(v.symbols, s.code) })}
            />
          ))}
        </div>
        {analysis.flags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Otomatik uyarılar">
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
              status={RESULT[analysis.suggested].status}
              label={RESULT[analysis.suggested].label}
            />
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Sonuç" className="flex flex-wrap gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40">
              <input
                type="radio"
                name="result"
                checked={v.result === null}
                onChange={() => set({ result: null })}
                className="accent-primary"
              />
              Otomatik ({RESULT[analysis.suggested].label})
            </label>
            {RESULTS.map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40"
              >
                <input
                  type="radio"
                  name="result"
                  value={r}
                  checked={v.result === r}
                  onChange={() => set({ result: r })}
                  className="accent-primary"
                />
                {RESULT[r].label}
              </label>
            ))}
          </div>
          <div>
            <Label htmlFor="pn-comment" className="mb-1.5 block text-sm">
              Okuyucu yorumu
            </Label>
            <Textarea
              id="pn-comment"
              rows={3}
              value={v.comment}
              onChange={(e) => set({ comment: e.target.value })}
              placeholder="Değerlendirme, öneri, ileri tetkik…"
            />
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
