import type {
  AlcoholHabit,
  Anamnesis,
  BodySystemKey,
  FitnessDecision,
  SmokingHabit,
  SystemStatus,
  SystemsExam,
} from '@osgb/shared-types';
import { BODY_SYSTEMS } from '@osgb/shared-types';
import type { HealthReport, HealthReportUpdateInput } from '@/types/health-report';

export interface ReportFormValues {
  date: string;
  time: string;
  physicianProfileId: string | null;
  anamnesis: {
    complaints: string;
    pastIllnesses: string;
    surgeries: string;
    familyHistory: string;
    medications: string;
    allergies: string;
    smoking: SmokingHabit | null;
    packYears: string;
    alcohol: AlcoholHabit | null;
    occupationalHistory: string;
    exposures: string[];
  };
  systems: Record<BodySystemKey, { status: SystemStatus; note: string }>;
  findings: string;
  fitnessDecision: FitnessDecision;
  restrictions: string;
  conclusion: string;
  nextExaminationDue: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function initialValues(report: HealthReport): ReportFormValues {
  const d = report.performedAt ? new Date(report.performedAt) : new Date();
  const a = report.anamnesis;
  const systems = Object.fromEntries(
    BODY_SYSTEMS.map((s) => {
      const f = report.systemsExam[s.key];
      return [s.key, { status: f?.status ?? 'NOT_EXAMINED', note: f?.note ?? '' }];
    }),
  ) as ReportFormValues['systems'];
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    physicianProfileId: report.physicianProfileId,
    anamnesis: {
      complaints: a.complaints ?? '',
      pastIllnesses: a.pastIllnesses ?? '',
      surgeries: a.surgeries ?? '',
      familyHistory: a.familyHistory ?? '',
      medications: a.medications ?? '',
      allergies: a.allergies ?? '',
      smoking: a.smoking ?? null,
      packYears: a.packYears === null || a.packYears === undefined ? '' : String(a.packYears),
      alcohol: a.alcohol ?? null,
      occupationalHistory: a.occupationalHistory ?? '',
      exposures: a.exposures ?? [],
    },
    systems,
    findings: report.findings ?? '',
    fitnessDecision: report.fitnessDecision,
    restrictions: report.restrictions ?? '',
    conclusion: report.conclusion ?? '',
    nextExaminationDue: report.nextExaminationDue ? report.nextExaminationDue.slice(0, 10) : '',
  };
}

/** Mark every system that has no explicit status as NORMAL (quick "all normal" action). */
export function allNormal(systems: ReportFormValues['systems']): ReportFormValues['systems'] {
  return Object.fromEntries(
    Object.entries(systems).map(([k, v]) => [
      k,
      v.status === 'NOT_EXAMINED' ? { ...v, status: 'NORMAL' } : v,
    ]),
  ) as ReportFormValues['systems'];
}

export function toInput(v: ReportFormValues): HealthReportUpdateInput {
  const anamnesis: Anamnesis = {
    complaints: v.anamnesis.complaints.trim() || null,
    pastIllnesses: v.anamnesis.pastIllnesses.trim() || null,
    surgeries: v.anamnesis.surgeries.trim() || null,
    familyHistory: v.anamnesis.familyHistory.trim() || null,
    medications: v.anamnesis.medications.trim() || null,
    allergies: v.anamnesis.allergies.trim() || null,
    smoking: v.anamnesis.smoking,
    packYears:
      v.anamnesis.smoking && v.anamnesis.smoking !== 'NEVER' && v.anamnesis.packYears.trim() !== ''
        ? Number(v.anamnesis.packYears.replace(',', '.'))
        : null,
    alcohol: v.anamnesis.alcohol,
    occupationalHistory: v.anamnesis.occupationalHistory.trim() || null,
    exposures: v.anamnesis.exposures,
  };
  const systemsExam: SystemsExam = Object.fromEntries(
    Object.entries(v.systems)
      .filter(([, f]) => f.status !== 'NOT_EXAMINED' || f.note.trim() !== '')
      .map(([k, f]) => [k, { status: f.status, note: f.note.trim() || null }]),
  );
  return {
    performedAt: new Date(`${v.date}T${v.time || '00:00'}:00`).toISOString(),
    physicianProfileId: v.physicianProfileId,
    anamnesis,
    systemsExam,
    findings: v.findings.trim() || null,
    fitnessDecision: v.fitnessDecision,
    restrictions:
      v.fitnessDecision === 'FIT_WITH_RESTRICTIONS' ? v.restrictions.trim() || null : null,
    conclusion: v.conclusion.trim() || null,
    nextExaminationDue: v.nextExaminationDue || null,
  };
}
