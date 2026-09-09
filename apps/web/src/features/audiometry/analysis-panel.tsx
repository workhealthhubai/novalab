import type { EarAnalysis } from '@osgb/shared-types';
import { AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/design-system/status-badge';
import { formatDate } from '@/features/patients/patient-utils';
import type { EarShift, TestAnalysis } from '@/types/audiometry';
import { FLAG_LABELS, formatDb, formatShift, GRADE_STATUS } from './audiometry-labels';

function EarCard({
  side,
  ear,
  baseline,
  previous,
}: {
  side: string;
  ear: EarAnalysis;
  baseline: EarShift | null;
  previous: EarShift | null;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{side}</h3>
        {ear.grade ? (
          <StatusBadge status={GRADE_STATUS[ear.grade.key]} label={ear.grade.label} />
        ) : (
          <span className="text-xs text-muted-foreground">Ortalama hesaplanamadı</span>
        )}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Dört frekans ort.</dt>
        <dd className="tabular-nums">{formatDb(ear.pta)}</dd>
        <dt className="text-muted-foreground">Başlangıca göre</dt>
        <dd className="tabular-nums">
          {formatShift(baseline?.shiftDb)}
          {baseline?.sts ? (
            <span className="ml-1 text-xs font-medium text-destructive">STS</span>
          ) : null}
        </dd>
        <dt className="text-muted-foreground">Önceki teste göre</dt>
        <dd className="tabular-nums">
          {formatShift(previous?.shiftDb)}
          {previous?.sts ? (
            <span className="ml-1 text-xs font-medium text-destructive">STS</span>
          ) : null}
        </dd>
        <dt className="text-muted-foreground">Gürültü çentiği</dt>
        <dd>{ear.noiseNotch ? <span className="font-medium text-warning">Var</span> : 'Yok'}</dd>
      </dl>
      {ear.missing.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Ölçülmeyen: {ear.missing.map((f) => (f >= 1000 ? `${f / 1000}k` : f)).join(', ')}
        </p>
      ) : null}
    </div>
  );
}

/** Per-ear grades and shifts, then the combined flags with their explanations. */
export function AnalysisPanel({ analysis }: { analysis: TestAnalysis }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <EarCard
          side="Sağ kulak"
          ear={analysis.right}
          baseline={analysis.vsBaseline?.right ?? null}
          previous={analysis.vsPrevious?.right ?? null}
        />
        <EarCard
          side="Sol kulak"
          ear={analysis.left}
          baseline={analysis.vsBaseline?.left ?? null}
          previous={analysis.vsPrevious?.left ?? null}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {analysis.vsBaseline
          ? `Başlangıç testi: ${formatDate(analysis.vsBaseline.performedAt)}`
          : 'Başlangıç testi yok (bu test referans olabilir).'}
        {analysis.vsPrevious
          ? ` · Önceki test: ${formatDate(analysis.vsPrevious.performedAt)}`
          : ''}
      </p>
      {analysis.flags.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {analysis.flags.map((flag) => (
            <li
              key={flag}
              className="flex gap-2 rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-sm"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>
                <span className="font-medium">{FLAG_LABELS[flag].label}</span>
                <span className="block text-xs text-muted-foreground">
                  {FLAG_LABELS[flag].description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
          Uyarı yok: eşik kayması ve gürültü çentiği saptanmadı.
        </p>
      )}
    </div>
  );
}
