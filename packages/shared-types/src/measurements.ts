/**
 * Structured measurements recorded on an examination (Muayene Karşılaştırma compares these
 * across visits). Keys are stored as strings so the catalogue can grow without a migration.
 */
export interface MeasurementDefinition {
  key: string;
  label: string;
  unit: string;
  group: 'Antropometri' | 'Vital bulgular' | 'Solunum' | 'İşitme' | 'Görme' | 'Laboratuvar';
  decimals: 0 | 1 | 2;
  /** Accepted input range (validation). */
  min: number;
  max: number;
  /** Reference range; values outside are flagged. Open ends are omitted. */
  normal?: { min?: number; max?: number };
  /** Computed from other keys (never stored). */
  derived?: boolean;
}

export const MEASUREMENT_DEFINITIONS: readonly MeasurementDefinition[] = [
  {
    key: 'HEIGHT',
    label: 'Boy',
    unit: 'cm',
    group: 'Antropometri',
    decimals: 0,
    min: 100,
    max: 250,
  },
  {
    key: 'WEIGHT',
    label: 'Kilo',
    unit: 'kg',
    group: 'Antropometri',
    decimals: 1,
    min: 30,
    max: 300,
  },
  {
    key: 'BMI',
    label: 'Vücut kitle indeksi',
    unit: 'kg/m²',
    group: 'Antropometri',
    decimals: 1,
    min: 10,
    max: 80,
    normal: { min: 18.5, max: 25 },
    derived: true,
  },
  {
    key: 'WAIST',
    label: 'Bel çevresi',
    unit: 'cm',
    group: 'Antropometri',
    decimals: 0,
    min: 40,
    max: 200,
  },
  {
    key: 'SYSTOLIC',
    label: 'Sistolik tansiyon',
    unit: 'mmHg',
    group: 'Vital bulgular',
    decimals: 0,
    min: 50,
    max: 260,
    normal: { min: 90, max: 140 },
  },
  {
    key: 'DIASTOLIC',
    label: 'Diyastolik tansiyon',
    unit: 'mmHg',
    group: 'Vital bulgular',
    decimals: 0,
    min: 30,
    max: 160,
    normal: { min: 60, max: 90 },
  },
  {
    key: 'PULSE',
    label: 'Nabız',
    unit: '/dk',
    group: 'Vital bulgular',
    decimals: 0,
    min: 30,
    max: 220,
    normal: { min: 50, max: 100 },
  },
  {
    key: 'SPO2',
    label: 'SpO₂',
    unit: '%',
    group: 'Vital bulgular',
    decimals: 0,
    min: 50,
    max: 100,
    normal: { min: 94 },
  },
  {
    key: 'FEV1',
    label: 'FEV1',
    unit: '% beklenen',
    group: 'Solunum',
    decimals: 0,
    min: 10,
    max: 200,
    normal: { min: 80 },
  },
  {
    key: 'FVC',
    label: 'FVC',
    unit: '% beklenen',
    group: 'Solunum',
    decimals: 0,
    min: 10,
    max: 200,
    normal: { min: 80 },
  },
  {
    key: 'FEV1_FVC',
    label: 'FEV1/FVC',
    unit: '%',
    group: 'Solunum',
    decimals: 0,
    min: 10,
    max: 100,
    normal: { min: 70 },
  },
  {
    key: 'HEARING_RIGHT',
    label: 'İşitme sağ (500–4000 Hz ort.)',
    unit: 'dB HL',
    group: 'İşitme',
    decimals: 0,
    min: -10,
    max: 120,
    normal: { max: 25 },
  },
  {
    key: 'HEARING_LEFT',
    label: 'İşitme sol (500–4000 Hz ort.)',
    unit: 'dB HL',
    group: 'İşitme',
    decimals: 0,
    min: -10,
    max: 120,
    normal: { max: 25 },
  },
  {
    key: 'VISION_RIGHT',
    label: 'Görme keskinliği sağ',
    unit: '',
    group: 'Görme',
    decimals: 1,
    min: 0,
    max: 2,
    normal: { min: 0.8 },
  },
  {
    key: 'VISION_LEFT',
    label: 'Görme keskinliği sol',
    unit: '',
    group: 'Görme',
    decimals: 1,
    min: 0,
    max: 2,
    normal: { min: 0.8 },
  },
  {
    key: 'GLUCOSE',
    label: 'Açlık glukozu',
    unit: 'mg/dL',
    group: 'Laboratuvar',
    decimals: 0,
    min: 20,
    max: 800,
    normal: { min: 70, max: 100 },
  },
  {
    key: 'HEMOGLOBIN',
    label: 'Hemoglobin',
    unit: 'g/dL',
    group: 'Laboratuvar',
    decimals: 1,
    min: 3,
    max: 25,
    normal: { min: 12, max: 17 },
  },
  {
    key: 'TOTAL_CHOLESTEROL',
    label: 'Total kolesterol',
    unit: 'mg/dL',
    group: 'Laboratuvar',
    decimals: 0,
    min: 50,
    max: 600,
    normal: { max: 200 },
  },
];

export const MEASUREMENT_KEYS: readonly string[] = MEASUREMENT_DEFINITIONS.map((m) => m.key);
export const STORABLE_MEASUREMENT_KEYS: readonly string[] = MEASUREMENT_DEFINITIONS.filter(
  (m) => !m.derived,
).map((m) => m.key);

export function measurementDefinition(key: string): MeasurementDefinition | undefined {
  return MEASUREMENT_DEFINITIONS.find((m) => m.key === key);
}

/** BMI from height (cm) and weight (kg); undefined when either is missing. */
export function computeBmi(
  heightCm: number | undefined,
  weightKg: number | undefined,
): number | undefined {
  if (!heightCm || !weightKg || heightCm <= 0) return undefined;
  const meters = heightCm / 100;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

/** 'LOW' | 'HIGH' when outside the reference range, 'NORMAL' inside, undefined without a range. */
export function classifyMeasurement(
  key: string,
  value: number,
): 'LOW' | 'NORMAL' | 'HIGH' | undefined {
  const normal = measurementDefinition(key)?.normal;
  if (!normal) return undefined;
  if (normal.min !== undefined && value < normal.min) return 'LOW';
  if (normal.max !== undefined && value > normal.max) return 'HIGH';
  return 'NORMAL';
}
