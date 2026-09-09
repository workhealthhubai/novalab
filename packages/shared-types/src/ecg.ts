/**
 * Resting 12-lead ECG helpers shared by the API and the web: reference ranges, QTc, flags and the
 * findings catalogue. Intervals are milliseconds, axis in degrees, heart rate in bpm.
 */
export const EcgRhythm = {
  SINUS: 'SINUS',
  SINUS_ARRHYTHMIA: 'SINUS_ARRHYTHMIA',
  SINUS_BRADYCARDIA: 'SINUS_BRADYCARDIA',
  SINUS_TACHYCARDIA: 'SINUS_TACHYCARDIA',
  ATRIAL_FIBRILLATION: 'ATRIAL_FIBRILLATION',
  ATRIAL_FLUTTER: 'ATRIAL_FLUTTER',
  SUPRAVENTRICULAR_TACHYCARDIA: 'SUPRAVENTRICULAR_TACHYCARDIA',
  PACED: 'PACED',
  OTHER: 'OTHER',
} as const;
export type EcgRhythm = (typeof EcgRhythm)[keyof typeof EcgRhythm];

export const EcgInterpretation = {
  NORMAL: 'NORMAL',
  BORDERLINE: 'BORDERLINE',
  ABNORMAL: 'ABNORMAL',
} as const;
export type EcgInterpretation = (typeof EcgInterpretation)[keyof typeof EcgInterpretation];

export interface EcgFindingDefinition {
  code: string;
  label: string;
  group: 'İletim' | 'Ritim / ektopi' | 'ST-T' | 'Hipertrofi' | 'Diğer';
  /** Findings that on their own make the tracing abnormal (vs borderline). */
  significant: boolean;
}

export const ECG_FINDINGS: readonly EcgFindingDefinition[] = [
  { code: 'AV_BLOCK_1', label: '1. derece AV blok', group: 'İletim', significant: false },
  { code: 'AV_BLOCK_2', label: '2. derece AV blok', group: 'İletim', significant: true },
  { code: 'AV_BLOCK_3', label: 'Tam AV blok', group: 'İletim', significant: true },
  { code: 'RBBB', label: 'Sağ dal bloğu', group: 'İletim', significant: true },
  {
    code: 'INCOMPLETE_RBBB',
    label: 'İnkomplet sağ dal bloğu',
    group: 'İletim',
    significant: false,
  },
  { code: 'LBBB', label: 'Sol dal bloğu', group: 'İletim', significant: true },
  { code: 'LAFB', label: 'Sol anterior fasiküler blok', group: 'İletim', significant: false },
  { code: 'WPW', label: 'Preeksitasyon (WPW)', group: 'İletim', significant: true },
  { code: 'PAC', label: 'Atriyal erken vuru', group: 'Ritim / ektopi', significant: false },
  { code: 'PVC', label: 'Ventriküler erken vuru', group: 'Ritim / ektopi', significant: false },
  {
    code: 'FREQUENT_PVC',
    label: 'Sık ventriküler erken vuru',
    group: 'Ritim / ektopi',
    significant: true,
  },
  { code: 'ST_ELEVATION', label: 'ST elevasyonu', group: 'ST-T', significant: true },
  { code: 'ST_DEPRESSION', label: 'ST depresyonu', group: 'ST-T', significant: true },
  { code: 'T_INVERSION', label: 'T negatifliği', group: 'ST-T', significant: true },
  {
    code: 'EARLY_REPOLARIZATION',
    label: 'Erken repolarizasyon',
    group: 'ST-T',
    significant: false,
  },
  { code: 'PATHOLOGIC_Q', label: 'Patolojik Q dalgası', group: 'ST-T', significant: true },
  { code: 'LVH', label: 'Sol ventrikül hipertrofisi', group: 'Hipertrofi', significant: true },
  { code: 'RVH', label: 'Sağ ventrikül hipertrofisi', group: 'Hipertrofi', significant: true },
  { code: 'LAE', label: 'Sol atriyal genişleme', group: 'Hipertrofi', significant: false },
  { code: 'RAE', label: 'Sağ atriyal genişleme', group: 'Hipertrofi', significant: false },
  { code: 'LOW_VOLTAGE', label: 'Düşük voltaj', group: 'Diğer', significant: false },
  { code: 'POOR_R_PROGRESSION', label: 'Zayıf R progresyonu', group: 'Diğer', significant: false },
  { code: 'ARTIFACT', label: 'Artefakt / teknik yetersizlik', group: 'Diğer', significant: false },
];
export const ECG_FINDING_CODES: readonly string[] = ECG_FINDINGS.map((f) => f.code);

export const ECG_RANGES = {
  heartRate: { min: 20, max: 300, normal: { min: 60, max: 100 } },
  prInterval: { min: 40, max: 600, normal: { min: 120, max: 200 } },
  qrsDuration: { min: 40, max: 300, normal: { max: 119 } },
  qtInterval: { min: 200, max: 800 },
  qtcInterval: { min: 200, max: 800, normalMale: 450, normalFemale: 460, marked: 500 },
  axis: { min: -180, max: 180, normal: { min: -30, max: 90 } },
} as const;

/** Bazett: QTc = QT / √RR, RR in seconds. */
export function bazettQtc(
  qtMs: number | null | undefined,
  heartRate: number | null | undefined,
): number | null {
  if (!qtMs || !heartRate || heartRate <= 0) return null;
  const rr = 60 / heartRate;
  return Math.round(qtMs / Math.sqrt(rr));
}

export type EcgFlag =
  | 'BRADYCARDIA'
  | 'TACHYCARDIA'
  | 'SHORT_PR'
  | 'LONG_PR'
  | 'WIDE_QRS'
  | 'LONG_QTC'
  | 'MARKEDLY_LONG_QTC'
  | 'LEFT_AXIS'
  | 'RIGHT_AXIS'
  | 'EXTREME_AXIS'
  | 'NON_SINUS_RHYTHM';

export interface EcgInput {
  heartRate?: number | null;
  rhythm?: EcgRhythm | null;
  prInterval?: number | null;
  qrsDuration?: number | null;
  qtInterval?: number | null;
  /** Given by the device; otherwise Bazett from QT and rate. */
  qtcInterval?: number | null;
  axis?: number | null;
  findings?: readonly string[];
}

export interface EcgAnalysis {
  qtc: number | null;
  qtcSource: 'device' | 'bazett' | null;
  flags: EcgFlag[];
  /** Suggested interpretation from flags and findings; the physician may override. */
  suggested: EcgInterpretation;
}

export function analyzeEcg(
  input: EcgInput,
  gender: 'MALE' | 'FEMALE' | null | undefined,
): EcgAnalysis {
  const flags: EcgFlag[] = [];
  const hr = input.heartRate ?? null;
  if (hr !== null && hr < ECG_RANGES.heartRate.normal.min) flags.push('BRADYCARDIA');
  if (hr !== null && hr > ECG_RANGES.heartRate.normal.max) flags.push('TACHYCARDIA');
  const pr = input.prInterval ?? null;
  if (pr !== null && pr < ECG_RANGES.prInterval.normal.min) flags.push('SHORT_PR');
  if (pr !== null && pr > ECG_RANGES.prInterval.normal.max) flags.push('LONG_PR');
  const qrs = input.qrsDuration ?? null;
  if (qrs !== null && qrs > ECG_RANGES.qrsDuration.normal.max) flags.push('WIDE_QRS');
  const qtc = input.qtcInterval ?? bazettQtc(input.qtInterval, hr);
  const qtcSource: EcgAnalysis['qtcSource'] = input.qtcInterval
    ? 'device'
    : qtc !== null
      ? 'bazett'
      : null;
  const qtcLimit =
    gender === 'FEMALE' ? ECG_RANGES.qtcInterval.normalFemale : ECG_RANGES.qtcInterval.normalMale;
  if (qtc !== null && qtc >= ECG_RANGES.qtcInterval.marked) flags.push('MARKEDLY_LONG_QTC');
  else if (qtc !== null && qtc > qtcLimit) flags.push('LONG_QTC');
  const axis = input.axis ?? null;
  if (axis !== null) {
    if (axis < -90 || axis > 180) flags.push('EXTREME_AXIS');
    else if (axis < ECG_RANGES.axis.normal.min) flags.push('LEFT_AXIS');
    else if (axis > ECG_RANGES.axis.normal.max) flags.push('RIGHT_AXIS');
  }
  const rhythm = input.rhythm ?? null;
  if (
    rhythm &&
    !['SINUS', 'SINUS_ARRHYTHMIA', 'SINUS_BRADYCARDIA', 'SINUS_TACHYCARDIA'].includes(rhythm)
  )
    flags.push('NON_SINUS_RHYTHM');

  const findings = input.findings ?? [];
  const significant = findings.some(
    (code) => ECG_FINDINGS.find((f) => f.code === code)?.significant,
  );
  const abnormalFlags: EcgFlag[] = [
    'MARKEDLY_LONG_QTC',
    'WIDE_QRS',
    'EXTREME_AXIS',
    'NON_SINUS_RHYTHM',
  ];
  const suggested: EcgInterpretation =
    significant || flags.some((f) => abnormalFlags.includes(f))
      ? 'ABNORMAL'
      : flags.length > 0 || findings.length > 0
        ? 'BORDERLINE'
        : 'NORMAL';
  return { qtc, qtcSource, flags, suggested };
}
