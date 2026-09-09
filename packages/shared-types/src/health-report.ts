/**
 * Structured content of the occupational health examination report (Ek-2 style "İşe Giriş /
 * Periyodik Muayene Formu"), shared by the API (validation, PDF) and the web (editor).
 */
export const BODY_SYSTEMS = [
  { key: 'HEAD_NECK', label: 'Baş-boyun' },
  { key: 'EYES', label: 'Göz' },
  { key: 'ENT', label: 'Kulak-burun-boğaz' },
  { key: 'RESPIRATORY', label: 'Solunum sistemi' },
  { key: 'CARDIOVASCULAR', label: 'Kardiyovasküler sistem' },
  { key: 'GASTROINTESTINAL', label: 'Sindirim sistemi' },
  { key: 'GENITOURINARY', label: 'Genitoüriner sistem' },
  { key: 'MUSCULOSKELETAL', label: 'Kas-iskelet sistemi' },
  { key: 'NEUROLOGICAL', label: 'Nörolojik sistem' },
  { key: 'SKIN', label: 'Cilt' },
  { key: 'PSYCHIATRIC', label: 'Ruhsal durum' },
  { key: 'ENDOCRINE', label: 'Endokrin / metabolik' },
] as const;
export type BodySystemKey = (typeof BODY_SYSTEMS)[number]['key'];
export const BODY_SYSTEM_KEYS: readonly string[] = BODY_SYSTEMS.map((s) => s.key);

export const SystemStatus = {
  NORMAL: 'NORMAL',
  ABNORMAL: 'ABNORMAL',
  NOT_EXAMINED: 'NOT_EXAMINED',
} as const;
export type SystemStatus = (typeof SystemStatus)[keyof typeof SystemStatus];

export interface SystemFinding {
  status: SystemStatus;
  note?: string | null;
}
export type SystemsExam = Partial<Record<BodySystemKey, SystemFinding>>;

/** Workplace exposures asked on the form (Ek-2 section "Çalışma ortamı"). */
export const EXPOSURES = [
  { key: 'NOISE', label: 'Gürültü' },
  { key: 'DUST', label: 'Toz' },
  { key: 'CHEMICAL', label: 'Kimyasal' },
  { key: 'VIBRATION', label: 'Titreşim' },
  { key: 'RADIATION', label: 'Radyasyon' },
  { key: 'HEAT_COLD', label: 'Sıcak / soğuk' },
  { key: 'BIOLOGICAL', label: 'Biyolojik etken' },
  { key: 'ERGONOMIC', label: 'Ergonomik yük / ağır kaldırma' },
  { key: 'DISPLAY_SCREEN', label: 'Ekranlı araç' },
  { key: 'HEIGHT', label: 'Yüksekte çalışma' },
  { key: 'SHIFT_WORK', label: 'Vardiyalı / gece çalışması' },
  { key: 'CONFINED_SPACE', label: 'Kapalı alan' },
] as const;
export const EXPOSURE_KEYS: readonly string[] = EXPOSURES.map((e) => e.key);

export const SmokingHabit = { NEVER: 'NEVER', FORMER: 'FORMER', CURRENT: 'CURRENT' } as const;
export type SmokingHabit = (typeof SmokingHabit)[keyof typeof SmokingHabit];
export const AlcoholHabit = { NONE: 'NONE', OCCASIONAL: 'OCCASIONAL', REGULAR: 'REGULAR' } as const;
export type AlcoholHabit = (typeof AlcoholHabit)[keyof typeof AlcoholHabit];

export interface Anamnesis {
  complaints?: string | null;
  pastIllnesses?: string | null;
  surgeries?: string | null;
  familyHistory?: string | null;
  medications?: string | null;
  allergies?: string | null;
  smoking?: SmokingHabit | null;
  /** Packs/day × years, when smoking is not NEVER. */
  packYears?: number | null;
  alcohol?: AlcoholHabit | null;
  occupationalHistory?: string | null;
  exposures?: string[];
}

export interface ReportReadinessInput {
  performedAt: Date | string | null;
  fitnessDecision: string;
  physicianProfileId: string | null;
  restrictions: string | null;
  conclusion: string | null;
}

/** Reasons the report cannot be approved yet (empty = ready). */
export function reportBlockers(exam: ReportReadinessInput): string[] {
  const blockers: string[] = [];
  if (!exam.performedAt) blockers.push('MISSING_PERFORMED_AT');
  if (exam.fitnessDecision === 'PENDING') blockers.push('MISSING_DECISION');
  if (!exam.physicianProfileId) blockers.push('MISSING_PHYSICIAN');
  if (exam.fitnessDecision === 'FIT_WITH_RESTRICTIONS' && !exam.restrictions?.trim())
    blockers.push('MISSING_RESTRICTIONS');
  if (exam.fitnessDecision === 'UNFIT' && !exam.conclusion?.trim())
    blockers.push('MISSING_CONCLUSION');
  return blockers;
}
