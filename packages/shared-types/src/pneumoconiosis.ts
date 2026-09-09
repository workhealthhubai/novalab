/**
 * ILO 2011 classification of chest radiographs for pneumoconiosis, shared by the API and the web.
 * Profusion is the 12-point scale; category 0–3 and the reading result are derived from it.
 */
export const PROFUSIONS = [
  '0/-',
  '0/0',
  '0/1',
  '1/0',
  '1/1',
  '1/2',
  '2/1',
  '2/2',
  '2/3',
  '3/2',
  '3/3',
  '3/+',
] as const;
export type Profusion = (typeof PROFUSIONS)[number];

/** Small opacity shapes: p/q/r rounded (≤1.5 / ≤3 / ≤10 mm), s/t/u irregular. */
export const OPACITY_SHAPES = ['p', 'q', 'r', 's', 't', 'u'] as const;
export type OpacityShape = (typeof OPACITY_SHAPES)[number];

export const LUNG_ZONES = ['RU', 'RM', 'RL', 'LU', 'LM', 'LL'] as const;
export type LungZone = (typeof LUNG_ZONES)[number];
export const LUNG_ZONE_LABELS: Record<LungZone, string> = {
  RU: 'Sağ üst',
  RM: 'Sağ orta',
  RL: 'Sağ alt',
  LU: 'Sol üst',
  LM: 'Sol orta',
  LL: 'Sol alt',
};

/** Large opacities: 0 none, A ≤ 50 mm, B > 50 mm but ≤ right upper zone, C > right upper zone. */
export const LARGE_OPACITIES = ['0', 'A', 'B', 'C'] as const;
export type LargeOpacity = (typeof LARGE_OPACITIES)[number];

export const FILM_QUALITIES: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: '1 · İyi' },
  { value: 2, label: '2 · Kabul edilebilir' },
  { value: 3, label: '3 · Kabul edilebilir, kusurlu' },
  { value: 4, label: '4 · Kabul edilemez' },
];

export const PneumoconiosisResult = {
  NEGATIVE: 'NEGATIVE',
  BORDERLINE: 'BORDERLINE',
  POSITIVE: 'POSITIVE',
} as const;
export type PneumoconiosisResult = (typeof PneumoconiosisResult)[keyof typeof PneumoconiosisResult];

export interface IloSymbol {
  code: string;
  label: string;
  /** Warrants clinical follow-up regardless of the pneumoconiosis reading. */
  alert: boolean;
}

export const ILO_SYMBOLS: readonly IloSymbol[] = [
  { code: 'aa', label: 'Aort aterosklerozu', alert: false },
  { code: 'at', label: 'Belirgin apikal plevral kalınlaşma', alert: false },
  { code: 'ax', label: 'Küçük opasitelerin birleşmesi', alert: true },
  { code: 'bu', label: 'Bül', alert: false },
  { code: 'ca', label: 'Akciğer veya plevra kanseri', alert: true },
  { code: 'cg', label: 'Kalsifiye hilar/mediastinal lenf nodu', alert: false },
  { code: 'cn', label: 'Küçük opasitelerde kalsifikasyon', alert: false },
  { code: 'co', label: 'Kalp boyutu/şekli anormalliği', alert: false },
  { code: 'cp', label: 'Kor pulmonale', alert: true },
  { code: 'cv', label: 'Kavite', alert: true },
  { code: 'di', label: 'İntratorasik organlarda belirgin distorsiyon', alert: false },
  { code: 'ef', label: 'Plevral efüzyon', alert: true },
  { code: 'em', label: 'Amfizem', alert: false },
  {
    code: 'es',
    label: 'Hilar/mediastinal lenf nodlarında yumurta kabuğu kalsifikasyonu',
    alert: false,
  },
  { code: 'fr', label: 'Kırık kaburga', alert: false },
  { code: 'hi', label: 'Hilar/mediastinal lenf nodu büyümesi', alert: true },
  { code: 'ho', label: 'Bal peteği akciğer', alert: true },
  { code: 'id', label: 'Diyafram konturunda belirsizlik', alert: false },
  { code: 'ih', label: 'Kalp konturunda belirsizlik', alert: false },
  { code: 'kl', label: 'Septal (Kerley) çizgileri', alert: false },
  { code: 'me', label: 'Mezotelyoma', alert: true },
  { code: 'pa', label: 'Plak atelektazi', alert: false },
  { code: 'pb', label: 'Parankimal bantlar', alert: false },
  { code: 'pi', label: 'İnterlober fissür plevral kalınlaşması', alert: false },
  { code: 'px', label: 'Pnömotoraks', alert: true },
  { code: 'ra', label: 'Yuvarlak atelektazi', alert: false },
  { code: 'rp', label: 'Romatoid pnömokonyoz', alert: true },
  { code: 'tb', label: 'Tüberküloz', alert: true },
  { code: 'od', label: 'Diğer anormallik', alert: false },
];
export const ILO_SYMBOL_CODES: readonly string[] = ILO_SYMBOLS.map((s) => s.code);

/** Major category (0–3) of the profusion; null when not read. */
export function profusionCategory(profusion: string | null | undefined): number | null {
  if (!profusion || !(PROFUSIONS as readonly string[]).includes(profusion)) return null;
  return Number(profusion[0]);
}

export interface PneumoconiosisInput {
  filmQuality?: number | null;
  profusion?: string | null;
  zones?: readonly string[];
  largeOpacity?: string | null;
  pleuralPlaques?: boolean;
  diffuseThickening?: boolean;
  costophrenicObliteration?: readonly string[];
  symbols?: readonly string[];
}

export type PneumoconiosisFlag =
  | 'UNREADABLE'
  | 'SMALL_OPACITIES'
  | 'LARGE_OPACITIES'
  | 'PLEURAL_ABNORMALITY'
  | 'SYMBOL_ALERT'
  | 'PROGRESSION';

export interface PneumoconiosisAnalysis {
  category: number | null;
  zoneCount: number;
  pleuralAbnormality: boolean;
  alertSymbols: string[];
  /** Category of the previous reading, when compared. */
  previousCategory: number | null;
  flags: PneumoconiosisFlag[];
  suggested: PneumoconiosisResult;
}

export function analyzePneumoconiosis(
  input: PneumoconiosisInput,
  previousProfusion?: string | null,
): PneumoconiosisAnalysis {
  const category = profusionCategory(input.profusion);
  const previousCategory = profusionCategory(previousProfusion);
  const large = input.largeOpacity && input.largeOpacity !== '0';
  const pleuralAbnormality = Boolean(
    input.pleuralPlaques ||
    input.diffuseThickening ||
    (input.costophrenicObliteration?.length ?? 0) > 0,
  );
  const alertSymbols = (input.symbols ?? []).filter(
    (code) => ILO_SYMBOLS.find((s) => s.code === code)?.alert,
  );
  const flags: PneumoconiosisFlag[] = [];
  if (input.filmQuality === 4) flags.push('UNREADABLE');
  if (category !== null && category >= 1) flags.push('SMALL_OPACITIES');
  if (large) flags.push('LARGE_OPACITIES');
  if (pleuralAbnormality) flags.push('PLEURAL_ABNORMALITY');
  if (alertSymbols.length > 0) flags.push('SYMBOL_ALERT');
  if (category !== null && previousCategory !== null && category > previousCategory)
    flags.push('PROGRESSION');
  const suggested: PneumoconiosisResult =
    large || (category !== null && category >= 1)
      ? 'POSITIVE'
      : input.profusion === '0/1'
        ? 'BORDERLINE'
        : 'NEGATIVE';
  return {
    category,
    zoneCount: input.zones?.length ?? 0,
    pleuralAbnormality,
    alertSymbols,
    previousCategory,
    flags,
    suggested,
  };
}
