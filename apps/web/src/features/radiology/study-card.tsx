import { Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AppButton } from '@/design-system/app-button';
import { formatDate } from '@/features/patients/patient-utils';
import type { StudySummary } from '@/types/radiology';

interface StudyCardProps {
  study: StudySummary;
  actionLabel?: string;
  onAction?: (study: StudySummary) => void;
  busy?: boolean;
}

/** One PACS study (date, description, modalities, counts, DICOM patient) with an optional action. */
export function StudyCard({ study, actionLabel, onAction, busy = false }: StudyCardProps) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">
          {study.description ?? 'Açıklamasız çalışma'}
          <span className="ml-2 font-normal text-muted-foreground">
            {study.studyDate ? formatDate(study.studyDate) : '—'}
            {study.studyTime ? ` ${study.studyTime}` : ''}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {study.patientName ?? 'Hasta adı yok'}
          {study.patientId ? ` · ID ${study.patientId}` : ''}
          {study.patientBirthDate ? ` · ${formatDate(study.patientBirthDate)}` : ''}
        </p>
        <p className="mt-0.5 font-mono text-[11px] break-all text-muted-foreground">
          {study.studyInstanceUid}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {study.modalities.map((m) => (
          <Badge key={m} variant="neutral">
            {m}
          </Badge>
        ))}
        <span className="text-xs text-muted-foreground">
          {study.seriesCount} seri · {study.instanceCount} görüntü
        </span>
        {!study.isStable ? <Badge variant="neutral">aktarılıyor</Badge> : null}
      </div>
      {actionLabel && onAction ? (
        <AppButton size="sm" variant="secondary" onClick={() => onAction(study)} loading={busy}>
          <Link2 />
          {actionLabel}
        </AppButton>
      ) : null}
    </li>
  );
}
