import { PERMISSIONS } from '@osgb/shared-types';
import {
  Activity,
  Ear,
  Eye,
  FileHeart,
  GitCompare,
  PenLine,
  ScanLine,
  ScanSearch,
  Wind,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { AppButton } from '@/design-system/app-button';
import { SectionCard } from '@/design-system/section-card';
import { StatusBadge } from '@/design-system/status-badge';
import { FITNESS_DECISION } from '@/features/examinations/examination-labels';
import { usePatientMedicalSummary } from '@/features/health-reports/use-health-reports';
import { usePermissions } from '@/hooks/use-permissions';
import type { PatientMedicalSummary } from '@/types/health-report';
import { formatDate } from './patient-utils';

const RESULT_TR: Record<string, string> = {
  NORMAL: 'Normal',
  BORDERLINE: 'Sınırda',
  ABNORMAL: 'Anormal',
  OBSTRUCTIVE: 'Obstrüktif',
  RESTRICTIVE: 'Restriktif',
  MIXED: 'Mikst',
  NEGATIVE: 'Negatif',
  POSITIVE: 'Pozitif',
  NONE: 'Normal',
  GLASSES: 'Gözlük',
  REFERRAL: 'Sevk',
  REQUESTED: 'İstendi',
  COMPLETED: 'Görüntü alındı',
  REPORTED: 'Raporlandı',
  CANCELLED: 'İptal',
  SCHEDULED: 'Planlandı',
  IN_PROGRESS: 'Çekimde',
};

interface Row {
  key: keyof PatientMedicalSummary;
  label: string;
  icon: ReactNode;
  listPath: string;
  newPath: string | null;
  detail: (
    s: PatientMedicalSummary,
  ) => { text: string; to: string | null; date: string | null; alert: boolean } | null;
}

const q = (patientId: string) => `?patientId=${patientId}`;

function rows(patientId: string): Row[] {
  return [
    {
      key: 'report',
      label: 'Sağlık raporu',
      icon: <FileHeart className="size-4" />,
      listPath: `${PATHS.healthReports}${q(patientId)}`,
      newPath: null,
      detail: (s) =>
        s.report.id
          ? {
              text: `${FITNESS_DECISION[s.report.fitnessDecision ?? 'PENDING'].label}${s.report.protocol ? ` · ${s.report.protocol.protocolNumber}` : ''}${s.report.nextExaminationDue ? ` · sonraki ${formatDate(s.report.nextExaminationDue)}` : ''}`,
              to: PATHS.healthReport.replace(':examinationId', s.report.id),
              date: s.report.performedAt ?? null,
              alert:
                s.report.fitnessDecision === 'UNFIT' ||
                s.report.fitnessDecision === 'FIT_WITH_RESTRICTIONS',
            }
          : null,
    },
    {
      key: 'audiometry',
      label: 'Odyometri',
      icon: <Ear className="size-4" />,
      listPath: `${PATHS.audiometry}${q(patientId)}`,
      newPath: `${PATHS.audiometryNew}${q(patientId)}`,
      detail: (s) =>
        s.audiometry.id
          ? {
              text: `sağ ${s.audiometry.ptaRight ?? '—'} / sol ${s.audiometry.ptaLeft ?? '—'} dB`,
              to: PATHS.audiometryTest.replace(':testId', s.audiometry.id),
              date: s.audiometry.performedAt ?? null,
              alert: (s.audiometry.ptaRight ?? 0) > 25 || (s.audiometry.ptaLeft ?? 0) > 25,
            }
          : null,
    },
    {
      key: 'spirometry',
      label: 'Spirometri',
      icon: <Wind className="size-4" />,
      listPath: `${PATHS.spirometry}${q(patientId)}`,
      newPath: `${PATHS.spirometryNew}${q(patientId)}`,
      detail: (s) =>
        s.spirometry.id
          ? {
              text: s.spirometry.pattern
                ? (RESULT_TR[s.spirometry.pattern] ?? s.spirometry.pattern)
                : 'patern belirtilmedi',
              to: PATHS.spirometryTest.replace(':testId', s.spirometry.id),
              date: s.spirometry.performedAt ?? null,
              alert: Boolean(s.spirometry.pattern && s.spirometry.pattern !== 'NORMAL'),
            }
          : null,
    },
    {
      key: 'eye',
      label: 'Göz',
      icon: <Eye className="size-4" />,
      listPath: `${PATHS.eye}${q(patientId)}`,
      newPath: `${PATHS.eyeNew}${q(patientId)}`,
      detail: (s) =>
        s.eye.id
          ? {
              text: RESULT_TR[s.eye.recommendation ?? ''] ?? s.eye.recommendation ?? '',
              to: PATHS.eyeExamination.replace(':examId', s.eye.id),
              date: s.eye.performedAt ?? null,
              alert: s.eye.recommendation !== 'NONE',
            }
          : null,
    },
    {
      key: 'ecg',
      label: 'EKG',
      icon: <Activity className="size-4" />,
      listPath: `${PATHS.ecg}${q(patientId)}`,
      newPath: `${PATHS.ecgNew}${q(patientId)}`,
      detail: (s) =>
        s.ecg.id
          ? {
              text: RESULT_TR[s.ecg.interpretation ?? ''] ?? s.ecg.interpretation ?? '',
              to: PATHS.ecgRecord.replace(':recordId', s.ecg.id),
              date: s.ecg.performedAt ?? null,
              alert: s.ecg.interpretation !== 'NORMAL',
            }
          : null,
    },
    {
      key: 'radiology',
      label: 'Radyoloji',
      icon: <ScanLine className="size-4" />,
      listPath: `${PATHS.radiology}${q(patientId)}`,
      newPath: `${PATHS.radiology}${q(patientId)}&new=1`,
      detail: (s) =>
        s.radiology.id
          ? {
              text: `${s.radiology.modality ?? ''} ${s.radiology.bodyPart ?? ''} · ${RESULT_TR[s.radiology.status ?? ''] ?? s.radiology.status ?? ''}`.trim(),
              to: PATHS.radiologyStudy.replace(':requestId', s.radiology.id),
              date: s.radiology.requestedAt ?? null,
              alert: false,
            }
          : null,
    },
    {
      key: 'pneumoconiosis',
      label: 'Pnömokonyoz (ILO)',
      icon: <ScanSearch className="size-4" />,
      listPath: `${PATHS.pneumoconiosis}${q(patientId)}`,
      newPath: `${PATHS.pneumoconiosisNew}${q(patientId)}`,
      detail: (s) =>
        s.pneumoconiosis.id
          ? {
              text: `${s.pneumoconiosis.profusion ?? 'okunamaz'} · ${RESULT_TR[s.pneumoconiosis.result ?? ''] ?? s.pneumoconiosis.result ?? ''}`,
              to: PATHS.pneumoconiosisReading.replace(':readingId', s.pneumoconiosis.id),
              date: s.pneumoconiosis.readAt ?? null,
              alert: s.pneumoconiosis.result !== 'NEGATIVE',
            }
          : null,
    },
  ];
}

/** Latest doctor-module records of the patient with jump links — the hub between reception and the doctor. */
export function PatientMedicalSummary({ patientId }: { patientId: string }) {
  const { can } = usePermissions();
  const summary = usePatientMedicalSummary(patientId, can(PERMISSIONS.EXAMINATIONS_READ));
  if (!can(PERMISSIONS.EXAMINATIONS_READ)) return null;
  return (
    <SectionCard
      title="Tıbbi kayıtlar"
      description="Her modülün son kaydı; yeni kayıt hasta seçili olarak açılır."
      actions={
        <div className="flex flex-wrap gap-1.5">
          <AppButton size="sm" variant="ghost" asChild>
            <Link to={`${PATHS.examinationComparison}${q(patientId)}`}>
              <GitCompare />
              Karşılaştır
            </Link>
          </AppButton>
          <AppButton size="sm" variant="ghost" asChild>
            <Link to={`${PATHS.documentSigning}${q(patientId)}`}>
              <PenLine />
              Belge İmza
            </Link>
          </AppButton>
        </div>
      }
    >
      {summary.data ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {rows(patientId).map((row) => {
            const d = row.detail(summary.data);
            const count = summary.data[row.key].count;
            return (
              <li
                key={row.key}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{row.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <Link to={row.listPath} className="font-medium text-foreground hover:underline">
                      {row.label}
                    </Link>
                    {count > 0 ? (
                      <span className="text-xs text-muted-foreground">{count} kayıt</span>
                    ) : null}
                  </span>
                  {d ? (
                    <Link
                      to={d.to ?? row.listPath}
                      className={`block truncate text-xs ${d.alert ? 'font-medium text-warning' : 'text-muted-foreground'} hover:underline`}
                    >
                      {d.date ? `${formatDate(d.date)} · ` : ''}
                      {d.text}
                    </Link>
                  ) : (
                    <span className="block text-xs text-muted-foreground">Kayıt yok</span>
                  )}
                </span>
                {d?.alert ? <StatusBadge status="waiting" label="Dikkat" /> : null}
                {row.newPath ? (
                  <AppButton size="sm" variant="ghost" asChild>
                    <Link to={row.newPath}>Yeni</Link>
                  </AppButton>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {summary.isPending ? 'Yükleniyor…' : 'Tıbbi kayıt özeti alınamadı.'}
        </p>
      )}
    </SectionCard>
  );
}
