import { MEASUREMENT_DEFINITIONS, type MeasurementDefinition } from '@osgb/shared-types';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AppButton } from '@/design-system/app-button';
import { FormField } from '@/design-system/form-field';
import { toApiError } from '@/services/api-client';
import type { ComparedExamination, MeasurementInput } from '@/types/examination';
import { useSetMeasurements } from './use-examinations';

interface MeasurementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examination: ComparedExamination | null;
  onSaved: () => void;
}

const STORABLE = MEASUREMENT_DEFINITIONS.filter((m) => !m.derived);
const GROUPS = [...new Set(STORABLE.map((m) => m.group))];

function initial(examination: ComparedExamination | null): Record<string, string> {
  const values: Record<string, string> = {};
  for (const def of STORABLE) {
    const v = examination?.measurements[def.key]?.value;
    values[def.key] = v === undefined ? '' : String(v);
  }
  return values;
}

function parse(def: MeasurementDefinition, raw: string): number | null | 'invalid' {
  const text = raw.trim().replace(',', '.');
  if (text === '') return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < def.min || value > def.max) return 'invalid';
  return Math.round(value * 10 ** def.decimals) / 10 ** def.decimals;
}

/** Structured measurement entry for one examination column (approved examinations are read-only). */
export function MeasurementsDialog({
  open,
  onOpenChange,
  examination,
  onSaved,
}: MeasurementsDialogProps) {
  const save = useSetMeasurements();
  const [values, setValues] = useState<Record<string, string>>(() => initial(examination));
  const [seed, setSeed] = useState({ open, id: examination?.id });
  if (seed.open !== open || seed.id !== examination?.id) {
    setSeed({ open, id: examination?.id });
    if (open) {
      setValues(initial(examination));
      save.reset();
    }
  }
  const invalid = STORABLE.filter((def) => parse(def, values[def.key] ?? '') === 'invalid').map(
    (d) => d.key,
  );
  const submit = () => {
    if (!examination) return;
    const measurements: MeasurementInput[] = [];
    for (const def of STORABLE) {
      const parsed = parse(def, values[def.key] ?? '');
      if (typeof parsed === 'number') measurements.push({ key: def.key, value: parsed });
    }
    save.mutate(
      { id: examination.id, measurements },
      {
        onSuccess: () => {
          onSaved();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>Ölçümler</DialogTitle>
          <DialogDescription>
            Boş bırakılan alanlar kaydedilmez; vücut kitle indeksi boy ve kilodan hesaplanır.
          </DialogDescription>
        </DialogHeader>
        {save.error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
          >
            {toApiError(save.error).message}
          </div>
        ) : null}
        <div className="scrollbar-subtle flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
          {GROUPS.map((group) => (
            <section key={group}>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group}
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {STORABLE.filter((m) => m.group === group).map((def) => (
                  <FormField
                    key={def.key}
                    id={`m-${def.key}`}
                    label={def.unit ? `${def.label} (${def.unit})` : def.label}
                    error={
                      invalid.includes(def.key) ? `${def.min}–${def.max} arası olmalı` : undefined
                    }
                  >
                    <Input
                      id={`m-${def.key}`}
                      inputMode="decimal"
                      value={values[def.key] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [def.key]: e.target.value }))}
                      aria-invalid={invalid.includes(def.key) || undefined}
                    />
                  </FormField>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <AppButton
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={save.isPending}
          >
            Vazgeç
          </AppButton>
          <AppButton
            onClick={submit}
            disabled={!examination || invalid.length > 0}
            loading={save.isPending}
          >
            Kaydet
          </AppButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
