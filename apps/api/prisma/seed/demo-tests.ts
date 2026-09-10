/* eslint-disable no-console */
/**
 * Demo seed, part 4: the doctor modules - audiometry (baseline + shift), ECG, spirometry
 * (obstructive / restrictive / decline), eye, radiology studies pushed to Orthanc and ILO
 * pneumoconiosis readings (A/B reader). Every record hangs on a protocol from demo-plan.ts.
 */
import {
  ageAt,
  analyzeEar,
  analyzeEye,
  analyzeSpirometry,
  averageThreshold,
  bazettQtc,
  ecscPredicted,
  PTA_FREQUENCIES,
} from '@osgb/shared-types';
import type { $Enums } from '../../src/generated/prisma/client';
import { createDocument, type DemoContext } from './demo-context';
import { birthDateOf, employeeId, employeeSpec } from './demo-definitions';
import { openedAtOf } from './demo-protocols';
import { protocolId, protocolPlan } from './demo-plan';
import { buildDicom, chestPixels, dicomUid } from './dicom';
import { addMinutes, tracePng, uid } from './lib';

type Thresholds = Record<string, number | null>;
const F = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
const t = (values: Array<number | null>): Thresholds =>
  Object.fromEntries(F.map((f, i) => [String(f), values[i] ?? null]));

const performedAt = (protocolKey: string, offsetMinutes: number) =>
  addMinutes(openedAtOf(protocolPlan(protocolKey)), offsetMinutes);
const performer = (ctx: DemoContext, key: 'nurse' | 'physician' | 'radiologist') =>
  ctx.users[key].id;

// ----------------------------- audiometry ------------------------------------

interface AudioSpec {
  protocol: string;
  isBaseline?: boolean;
  quietHours?: number;
  right: number[];
  left: number[];
  boneRight?: Array<number | null>;
  boneLeft?: Array<number | null>;
  notes?: string;
}

const AUDIOMETRY: AudioSpec[] = [
  {
    protocol: 'p24-1',
    isBaseline: true,
    quietHours: 16,
    right: [10, 10, 10, 15, 20, 25, 20, 15],
    left: [10, 10, 15, 15, 20, 25, 25, 15],
    notes: 'Bazal test - 16 saat gürültüsüz.',
  },
  {
    protocol: 'p25-1',
    quietHours: 14,
    right: [10, 10, 15, 20, 25, 30, 25, 20],
    left: [10, 15, 15, 20, 30, 35, 30, 20],
  },
  {
    protocol: 'p26-1',
    quietHours: 12,
    right: [10, 10, 15, 25, 35, 45, 40, 30],
    left: [10, 15, 15, 30, 40, 50, 45, 30],
    boneRight: [null, 10, 15, 25, 35, 45, null, null],
    boneLeft: [null, 15, 15, 30, 40, 50, null, null],
    notes: '3–6 kHz çentik; bazale göre STS pozitif. Kemik yolu hava ile uyumlu (sensörinöral).',
  },
  {
    protocol: 'p24-2',
    isBaseline: true,
    quietHours: 15,
    right: [5, 5, 10, 10, 10, 15, 10, 5],
    left: [5, 10, 10, 10, 15, 15, 10, 10],
  },
  {
    protocol: 'p26-2',
    quietHours: 14,
    right: [5, 10, 10, 10, 15, 15, 15, 10],
    left: [5, 10, 10, 15, 15, 20, 15, 10],
    notes: 'Bazale göre anlamlı kayma yok.',
  },
  {
    protocol: 'p26-3',
    quietHours: 40,
    right: [30, 35, 40, 50, 55, 60, 60, 55],
    left: [35, 40, 45, 50, 55, 65, 65, 60],
    notes: 'Orta derece bilateral kayıp.',
  },
  {
    protocol: 'p26-7',
    quietHours: 12,
    right: [10, 10, 15, 15, 20, 20, 25, 20],
    left: [15, 20, 25, 30, 35, 40, 40, 35],
    notes: 'Sol kulak hafif kayıp; KBB önerildi.',
  },
  {
    protocol: 'p26-4',
    isBaseline: true,
    quietHours: 16,
    right: [5, 10, 10, 10, 15, 15, 15, 10],
    left: [5, 10, 10, 15, 15, 15, 20, 10],
  },
  {
    protocol: 'p26-5',
    isBaseline: true,
    quietHours: 18,
    right: [5, 5, 5, 10, 10, 15, 10, 5],
    left: [5, 5, 10, 10, 10, 15, 15, 10],
  },
  {
    protocol: 'p26-12',
    quietHours: 10,
    right: [10, 10, 15, 15, 15, 15, 20, 15],
    left: [10, 10, 15, 15, 20, 15, 20, 15],
    boneRight: [null, 10, 15, 15, 15, 15, null, null],
    boneLeft: [null, 10, 15, 15, 20, 15, null, null],
  },
  {
    protocol: 'p26-14',
    quietHours: 14,
    right: [5, 10, 10, 10, 10, 15, 15, 10],
    left: [5, 10, 10, 15, 15, 15, 15, 10],
  },
  {
    protocol: 'p25-6',
    isBaseline: true,
    quietHours: 20,
    right: [10, 10, 10, 15, 15, 20, 15, 10],
    left: [10, 10, 15, 15, 20, 20, 15, 15],
  },
];

export async function seedAudiometry(ctx: DemoContext): Promise<void> {
  for (const spec of AUDIOMETRY) {
    const plan = protocolPlan(spec.protocol);
    const airRight = t(spec.right);
    const airLeft = t(spec.left);
    const id = uid(`audiometry:${spec.protocol}`);
    await ctx.prisma.audiometryTest.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        employeeId: employeeId(plan.employee),
        protocolId: protocolId(spec.protocol),
        performedAt: performedAt(spec.protocol, 60),
        performedById: performer(ctx, 'nurse'),
        deviceName: 'Interacoustics AD629',
        isBaseline: spec.isBaseline ?? false,
        quietHours: spec.quietHours ?? null,
        airRight,
        airLeft,
        boneRight: spec.boneRight ? t(spec.boneRight) : undefined,
        boneLeft: spec.boneLeft ? t(spec.boneLeft) : undefined,
        ptaRight: averageThreshold(airRight, PTA_FREQUENCIES),
        ptaLeft: averageThreshold(airLeft, PTA_FREQUENCIES),
        notes: spec.notes ?? null,
        createdAt: performedAt(spec.protocol, 60),
      },
      update: {},
    });
  }
  console.log(`✔ ${AUDIOMETRY.length} audiometry tests`);
}

// ----------------------------- ECG -------------------------------------------

interface EcgSpec {
  protocol: string;
  heartRate: number;
  rhythm: $Enums.EcgRhythm;
  pr: number;
  qrs: number;
  qt: number;
  qtc?: number | null;
  axis: number;
  findings?: string[];
  interpretation: $Enums.EcgInterpretation;
  comment?: string;
  trace?: boolean;
}

const ECG: EcgSpec[] = [
  {
    protocol: 'p24-2',
    heartRate: 74,
    rhythm: 'SINUS',
    pr: 150,
    qrs: 88,
    qt: 370,
    axis: 45,
    interpretation: 'NORMAL',
  },
  {
    protocol: 'p24-3',
    heartRate: 80,
    rhythm: 'SINUS',
    pr: 162,
    qrs: 94,
    qt: 372,
    axis: -10,
    findings: ['LVH'],
    interpretation: 'BORDERLINE',
    comment: 'Voltaj kriterleri ile LVH; hipertansiyon takibi.',
  },
  {
    protocol: 'p25-4',
    heartRate: 82,
    rhythm: 'SINUS',
    pr: 168,
    qrs: 98,
    qt: 384,
    qtc: 448,
    axis: -25,
    findings: ['LVH', 'ST_DEPRESSION'],
    interpretation: 'ABNORMAL',
    comment: 'V5-V6 ST depresyonu ve LVH; kardiyoloji konsültasyonu istendi.',
    trace: true,
  },
  {
    protocol: 'p25-6',
    heartRate: 52,
    rhythm: 'SINUS_BRADYCARDIA',
    pr: 176,
    qrs: 90,
    qt: 420,
    axis: 60,
    interpretation: 'NORMAL',
    comment: 'Semptomsuz sporcu bradikardisi.',
  },
  {
    protocol: 'p26-1',
    heartRate: 76,
    rhythm: 'SINUS',
    pr: 156,
    qrs: 90,
    qt: 366,
    axis: 40,
    interpretation: 'NORMAL',
  },
  {
    protocol: 'p26-3',
    heartRate: 104,
    rhythm: 'SINUS_TACHYCARDIA',
    pr: 158,
    qrs: 132,
    qt: 340,
    axis: 110,
    findings: ['RBBB', 'T_INVERSION', 'RAE'],
    interpretation: 'ABNORMAL',
    comment: 'Kor pulmonale açısından ekokardiyografi önerilir.',
    trace: true,
  },
  {
    protocol: 'p26-4',
    heartRate: 66,
    rhythm: 'SINUS',
    pr: 160,
    qrs: 108,
    qt: 392,
    axis: 30,
    findings: ['INCOMPLETE_RBBB'],
    interpretation: 'BORDERLINE',
    comment: 'İnkomplet sağ dal bloğu - normal varyant.',
    trace: true,
  },
  {
    protocol: 'p26-5',
    heartRate: 70,
    rhythm: 'SINUS',
    pr: 148,
    qrs: 86,
    qt: 380,
    axis: 55,
    interpretation: 'NORMAL',
  },
  {
    protocol: 'p26-8',
    heartRate: 78,
    rhythm: 'SINUS_ARRHYTHMIA',
    pr: 144,
    qrs: 84,
    qt: 372,
    axis: 50,
    interpretation: 'NORMAL',
    comment: 'Solunumsal sinüs aritmisi.',
  },
  {
    protocol: 'p26-12',
    heartRate: 70,
    rhythm: 'SINUS',
    pr: 154,
    qrs: 92,
    qt: 388,
    qtc: null,
    axis: 20,
    findings: ['PVC'],
    interpretation: 'BORDERLINE',
    comment: 'Tek izole VEV; QTc cihazdan gelmedi, Bazett ile hesaplandı.',
  },
];

export async function seedEcg(ctx: DemoContext): Promise<void> {
  for (const spec of ECG) {
    const plan = protocolPlan(spec.protocol);
    const at = performedAt(spec.protocol, 85);
    const id = uid(`ecg:${spec.protocol}`);
    let documentId: string | null = null;
    if (spec.trace) {
      const employee = employeeSpec(plan.employee);
      const document = await createDocument(ctx, {
        key: `documents/${uid(`ecg-trace:${spec.protocol}`)}-ekg.png`,
        category: 'ECG_TRACE',
        fileName: `EKG ${employee.first} ${employee.last} ${at.toISOString().slice(0, 10)}.png`,
        mimeType: 'image/png',
        body: await tracePng(
          'ecg',
          `EKG · ${employee.first} ${employee.last} · ${spec.heartRate}/dk`,
        ),
        isMedical: true,
        employeeId: employeeId(plan.employee),
        uploadedById: performer(ctx, 'nurse'),
        createdAt: at,
      });
      documentId = document?.id ?? null;
    }
    await ctx.prisma.ecgRecord.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        employeeId: employeeId(plan.employee),
        protocolId: protocolId(spec.protocol),
        performedAt: at,
        performedById: performer(ctx, 'nurse'),
        deviceName: 'Nihon Kohden ECG-2150',
        heartRate: spec.heartRate,
        rhythm: spec.rhythm,
        prInterval: spec.pr,
        qrsDuration: spec.qrs,
        qtInterval: spec.qt,
        qtcInterval: spec.qtc === null ? null : (spec.qtc ?? bazettQtc(spec.qt, spec.heartRate)),
        axis: spec.axis,
        findings: spec.findings ?? [],
        interpretation: spec.interpretation,
        comment: spec.comment ?? null,
        documentId,
        createdAt: at,
      },
      update: {},
    });
  }
  console.log(`✔ ${ECG.length} ECG records`);
}

// ----------------------------- spirometry ------------------------------------

interface SpiroSpec {
  protocol: string;
  fvc: number;
  fev1: number;
  pef: number;
  fef2575: number;
  postFvc?: number;
  postFev1?: number;
  smoking: $Enums.SmokingStatus;
  quality: string;
  isBaseline?: boolean;
  comment?: string;
  trace?: boolean;
  weightKg?: number;
}

const SPIROMETRY: SpiroSpec[] = [
  {
    protocol: 'p24-1',
    fvc: 4.6,
    fev1: 3.8,
    pef: 9.1,
    fef2575: 4.2,
    smoking: 'NEVER',
    quality: 'A',
    isBaseline: true,
    weightKg: 80,
  },
  {
    protocol: 'p25-1',
    fvc: 4.4,
    fev1: 3.55,
    pef: 8.7,
    fef2575: 3.8,
    smoking: 'NEVER',
    quality: 'A',
    weightKg: 83,
  },
  {
    protocol: 'p26-1',
    fvc: 4.2,
    fev1: 3.2,
    pef: 8.2,
    fef2575: 3.1,
    smoking: 'NEVER',
    quality: 'B',
    weightKg: 84,
    comment: 'Bazale göre FEV1 %16 düşüş; yıllık kayıp beklenenin üzerinde.',
    trace: true,
  },
  {
    protocol: 'p24-2',
    fvc: 3.6,
    fev1: 3.1,
    pef: 7.2,
    fef2575: 3.6,
    smoking: 'NEVER',
    quality: 'A',
    isBaseline: true,
    weightKg: 56,
  },
  {
    protocol: 'p25-2',
    fvc: 3.1,
    fev1: 1.9,
    pef: 4.8,
    fef2575: 1.4,
    postFvc: 3.2,
    postFev1: 2.2,
    smoking: 'CURRENT',
    quality: 'B',
    weightKg: 62,
    comment: 'Obstrüktif patern; bronkodilatör sonrası FEV1 +300 mL (%16) - reversibl.',
  },
  {
    protocol: 'p26-3',
    fvc: 2.6,
    fev1: 1.1,
    pef: 3.1,
    fef2575: 0.6,
    postFvc: 2.7,
    postFev1: 1.2,
    smoking: 'FORMER',
    quality: 'C',
    weightKg: 64,
    comment: 'Ağır obstrüksiyon (GOLD 3); reversibilite yok.',
    trace: true,
  },
  {
    protocol: 'p25-5',
    fvc: 3.0,
    fev1: 2.6,
    pef: 7.9,
    fef2575: 3.9,
    smoking: 'NEVER',
    quality: 'A',
    isBaseline: true,
    weightKg: 92,
    comment: 'FVC düşük, oran normal - kısıtlayıcı patern; obezite ile uyumlu.',
  },
  {
    protocol: 'p26-4',
    fvc: 4.7,
    fev1: 3.8,
    pef: 9.4,
    fef2575: 4.4,
    smoking: 'NEVER',
    quality: 'A',
    isBaseline: true,
    weightKg: 79,
  },
  {
    protocol: 'p26-5',
    fvc: 3.5,
    fev1: 3.0,
    pef: 7.0,
    fef2575: 3.5,
    smoking: 'NEVER',
    quality: 'A',
    isBaseline: true,
    weightKg: 60,
  },
  {
    protocol: 'p26-13',
    fvc: 4.5,
    fev1: 3.7,
    pef: 9.0,
    fef2575: 4.1,
    smoking: 'NEVER',
    quality: 'A',
    isBaseline: true,
    weightKg: 82,
    trace: true,
  },
];

export async function seedSpirometry(ctx: DemoContext): Promise<void> {
  for (const spec of SPIROMETRY) {
    const plan = protocolPlan(spec.protocol);
    const employee = employeeSpec(plan.employee);
    const at = performedAt(spec.protocol, 110);
    const predicted = ecscPredicted(
      employee.gender,
      employee.heightCm,
      ageAt(birthDateOf(plan.employee), at),
    );
    const analysis = analyzeSpirometry(
      {
        fvc: spec.fvc,
        fev1: spec.fev1,
        pef: spec.pef,
        fef2575: spec.fef2575,
        fvcPredicted: predicted?.fvc,
        fev1Predicted: predicted?.fev1,
        postFvc: spec.postFvc,
        postFev1: spec.postFev1,
      },
      {
        sex: employee.gender,
        heightCm: employee.heightCm,
        ageYears: ageAt(birthDateOf(plan.employee), at),
      },
    );
    const id = uid(`spirometry:${spec.protocol}`);
    let documentId: string | null = null;
    if (spec.trace) {
      const document = await createDocument(ctx, {
        key: `documents/${uid(`sft-trace:${spec.protocol}`)}-sft.png`,
        category: 'SPIROMETRY_TRACE',
        fileName: `SFT ${employee.first} ${employee.last} ${at.toISOString().slice(0, 10)}.png`,
        mimeType: 'image/png',
        body: await tracePng(
          'spirometry',
          `Spirometri · ${employee.first} ${employee.last} · FEV1 ${spec.fev1} L`,
        ),
        isMedical: true,
        employeeId: employeeId(plan.employee),
        uploadedById: performer(ctx, 'nurse'),
        createdAt: at,
      });
      documentId = document?.id ?? null;
    }
    await ctx.prisma.spirometryTest.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        employeeId: employeeId(plan.employee),
        protocolId: protocolId(spec.protocol),
        performedAt: at,
        performedById: performer(ctx, 'nurse'),
        deviceName: 'MIR Spirolab III',
        heightCm: employee.heightCm,
        weightKg: spec.weightKg ?? employee.weightKg,
        smokingStatus: spec.smoking,
        fvc: spec.fvc,
        fev1: spec.fev1,
        ratio: Math.round((spec.fev1 / spec.fvc) * 1000) / 10,
        pef: spec.pef,
        fef2575: spec.fef2575,
        fvcPredicted: predicted?.fvc ?? null,
        fev1Predicted: predicted?.fev1 ?? null,
        postFvc: spec.postFvc ?? null,
        postFev1: spec.postFev1 ?? null,
        qualityGrade: spec.quality,
        isBaseline: spec.isBaseline ?? false,
        pattern: analysis.pattern,
        comment: spec.comment ?? null,
        documentId,
        createdAt: at,
      },
      update: {},
    });
  }
  console.log(`✔ ${SPIROMETRY.length} spirometry tests`);
}

// ----------------------------- eye -------------------------------------------

interface EyeSpec {
  protocol: string;
  glasses?: boolean;
  lenses?: boolean;
  far: [number, number];
  corrected?: [number, number];
  near?: [number, number];
  ishihara?: [number, number];
  visualField?: $Enums.VisualFieldResult;
  findings?: string;
  recommendation?: $Enums.EyeRecommendation;
  comment?: string;
}

const EYE: EyeSpec[] = [
  { protocol: 'p24-2', far: [1.0, 1.0], near: [1, 1], ishihara: [14, 14], visualField: 'NORMAL' },
  {
    protocol: 'p24-3',
    glasses: true,
    far: [0.4, 0.5],
    corrected: [1.0, 1.0],
    near: [1, 1],
    ishihara: [13, 14],
    visualField: 'NORMAL',
    findings: 'Miyopi; gözlükle tam görme.',
  },
  {
    protocol: 'p25-4',
    glasses: true,
    far: [0.4, 0.5],
    corrected: [1.0, 0.9],
    near: [2, 2],
    ishihara: [13, 14],
    visualField: 'NORMAL',
  },
  {
    protocol: 'p25-6',
    far: [1.0, 1.0],
    near: [1, 1],
    ishihara: [14, 14],
    visualField: 'NORMAL',
    comment: 'Sürücü görme kriterlerini karşılıyor.',
  },
  {
    protocol: 'p26-2',
    far: [1.0, 1.0],
    near: [1, 1],
    ishihara: [14, 14],
    visualField: 'NOT_TESTED',
  },
  {
    protocol: 'p26-3',
    far: [0.8, 0.7],
    near: [2, 3],
    ishihara: [12, 14],
    visualField: 'ABNORMAL',
    findings: 'Konfrontasyon testinde sol üst kadran defekti; bilateral erken katarakt.',
    recommendation: 'REFERRAL',
    comment: 'Göz hastalıkları sevki.',
  },
  { protocol: 'p26-4', far: [1.0, 1.0], near: [1, 1], ishihara: [14, 14], visualField: 'NORMAL' },
  { protocol: 'p26-5', far: [1.0, 1.0], near: [1, 1], ishihara: [14, 14], visualField: 'NORMAL' },
  {
    protocol: 'p26-6',
    glasses: true,
    lenses: true,
    far: [0.3, 0.4],
    corrected: [1.0, 0.9],
    near: [1, 1],
    ishihara: [14, 14],
    visualField: 'NORMAL',
    findings: 'Miyopi -2.50 / -2.00; reçete 3 yıllık.',
    comment: 'Gözlük reçetesi yenilenmeli.',
  },
  {
    protocol: 'p26-7',
    far: [1.0, 1.0],
    near: [1, 1],
    ishihara: [6, 14],
    visualField: 'NORMAL',
    findings: 'Kırmızı-yeşil renk görme kusuru (protan?).',
    recommendation: 'REFERRAL',
    comment:
      'Elektrik işinde kablo renk ayrımı için göz hastalıkları değerlendirmesi; işverene bildirilecek.',
  },
  { protocol: 'p26-14', far: [1.0, 0.9], near: [1, 1], ishihara: [14, 14], visualField: 'NORMAL' },
  {
    protocol: 'p26-15',
    far: [1.0, 1.0],
    near: [3, 3],
    ishihara: [14, 14],
    visualField: 'NORMAL',
    findings: 'Presbiyopi başlangıcı.',
    comment: 'Yakın gözlüğü önerildi.',
  },
];

export async function seedEye(ctx: DemoContext): Promise<void> {
  for (const spec of EYE) {
    const plan = protocolPlan(spec.protocol);
    const at = performedAt(spec.protocol, 130);
    const input = {
      farRight: spec.far[0],
      farLeft: spec.far[1],
      farRightCorrected: spec.corrected?.[0] ?? null,
      farLeftCorrected: spec.corrected?.[1] ?? null,
      nearRight: spec.near?.[0] ?? null,
      nearLeft: spec.near?.[1] ?? null,
      ishiharaCorrect: spec.ishihara?.[0] ?? null,
      ishiharaTotal: spec.ishihara?.[1] ?? null,
      visualField: spec.visualField ?? 'NOT_TESTED',
    };
    const analysis = analyzeEye(input);
    const id = uid(`eye:${spec.protocol}`);
    await ctx.prisma.eyeExamination.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        employeeId: employeeId(plan.employee),
        protocolId: protocolId(spec.protocol),
        performedAt: at,
        performedById: performer(ctx, 'nurse'),
        usesGlasses: spec.glasses ?? false,
        usesContactLenses: spec.lenses ?? false,
        farRight: input.farRight,
        farLeft: input.farLeft,
        farRightCorrected: input.farRightCorrected,
        farLeftCorrected: input.farLeftCorrected,
        nearRight: input.nearRight,
        nearLeft: input.nearLeft,
        ishiharaCorrect: input.ishiharaCorrect,
        ishiharaTotal: input.ishiharaTotal,
        colorVision: analysis.colorVision,
        visualField: input.visualField,
        findings: spec.findings ?? null,
        recommendation: spec.recommendation ?? analysis.suggested,
        comment: spec.comment ?? null,
        createdAt: at,
      },
      update: {},
    });
  }
  console.log(`✔ ${EYE.length} eye examinations`);
}

// ----------------------------- radiology + pneumoconiosis --------------------

interface RadiologySpec {
  key: string;
  protocol: string;
  modality: $Enums.RadiologyModality;
  status: $Enums.RadiologyRequestStatus;
  bodyPart: string;
  clinicalInfo: string;
  study?: { opacityDensity?: number; description?: string };
  report?: string;
  reportedBy?: 'radiologist' | 'physician';
}

export const RADIOLOGY: RadiologySpec[] = [
  {
    key: 'r24-1',
    protocol: 'p24-1',
    modality: 'CR',
    status: 'COMPLETED',
    bodyPart: 'CHEST',
    clinicalInfo: 'Periyodik - silika/kaynak dumanı maruziyeti; ILO okuması için PA.',
    study: {},
  },
  {
    key: 'r24-2',
    protocol: 'p24-2',
    modality: 'CR',
    status: 'REPORTED',
    bodyPart: 'CHEST',
    clinicalInfo: 'İşe giriş PA akciğer grafisi.',
    study: {},
    report:
      'Kalp-toraks oranı normal. Her iki akciğer parankimi doğal. Kostofrenik sinüsler açık. Kemik yapılar doğal.\n\nSONUÇ: Normal PA akciğer grafisi.',
    reportedBy: 'radiologist',
  },
  {
    key: 'r26-1',
    protocol: 'p26-1',
    modality: 'CR',
    status: 'REPORTED',
    bodyPart: 'CHEST',
    clinicalInfo:
      'Periyodik; bazale göre SFT düşüşü ve eforla dispne. Pnömokonyoz açısından ILO okuması istenir.',
    study: { opacityDensity: 0.7, description: 'CHEST PA - ILO' },
    report:
      'Her iki akciğer üst-orta zonlarda yaygın, 1.5 mm altında yuvarlak (p/q) küçük opasiteler izlenmektedir; profüzyon 1/0 ile uyumludur. Büyük opasite yok. Plevral kalınlaşma/plak saptanmadı. Kostofrenik sinüsler açık. Kalp gölgesi normal.\n\nSONUÇ: Basit pnömokonyoz ile uyumlu erken bulgular; ILO sınıflaması ve klinik korelasyon önerilir.',
    reportedBy: 'radiologist',
  },
  {
    key: 'r26-3',
    protocol: 'p26-3',
    modality: 'DX',
    status: 'REPORTED',
    bodyPart: 'CHEST',
    clinicalInfo: 'KOAH alevlenmesi sonrası işe dönüş; amfizem bilinen.',
    study: { opacityDensity: 0.15, description: 'CHEST PA' },
    report:
      'Akciğer volümleri artmış, diyafragmalar düzleşmiş. Her iki üst zonda büllöz değişiklikler. Küçük opasite profüzyonu 0/1 düzeyinde. Kalp gölgesi dar ve vertikal; pulmoner konus belirgin.\n\nSONUÇ: Amfizem ve bül; kor pulmonale açısından değerlendirme önerilir.',
    reportedBy: 'radiologist',
  },
  {
    key: 'r26-7',
    protocol: 'p26-7',
    modality: 'CR',
    status: 'IN_PROGRESS',
    bodyPart: 'CHEST',
    clinicalInfo: 'Periyodik PA; rapor bekleniyor.',
    study: {},
  },
  {
    key: 'r25-5',
    protocol: 'p25-5',
    modality: 'CR',
    status: 'COMPLETED',
    bodyPart: 'CHEST',
    clinicalInfo: 'İşe giriş - ahşap tozu maruziyeti öngörülüyor.',
    study: {},
  },
  {
    key: 'r26-5',
    protocol: 'p26-5',
    modality: 'CR',
    status: 'COMPLETED',
    bodyPart: 'CHEST',
    clinicalInfo: 'İşe giriş standart paket.',
    study: {},
  },
  {
    key: 'r26-13',
    protocol: 'p26-13',
    modality: 'CR',
    status: 'SCHEDULED',
    bodyPart: 'CHEST',
    clinicalInfo: 'Periyodik PA - 2 gün sonra randevu.',
  },
  {
    key: 'r26-10',
    protocol: 'p26-10',
    modality: 'CR',
    status: 'REQUESTED',
    bodyPart: 'CHEST',
    clinicalInfo: 'İşe giriş standart paket.',
  },
  {
    key: 'r25-4',
    protocol: 'p25-4',
    modality: 'CR',
    status: 'CANCELLED',
    bodyPart: 'LSPINE',
    clinicalInfo: 'Bel ağrısı - lomber grafi; hasta talebiyle iptal.',
  },
  {
    key: 'r25-7',
    protocol: 'p25-7',
    modality: 'CR',
    status: 'CANCELLED',
    bodyPart: 'CHEST',
    clinicalInfo: '6 ay önce çekilmiş; tekrar gerekmedi.',
  },
];

export const radiologyRequestId = (key: string) => uid(`radiology:${key}`);

export async function seedRadiology(ctx: DemoContext): Promise<void> {
  let uploaded = 0;
  for (const spec of RADIOLOGY) {
    const plan = protocolPlan(spec.protocol);
    const employee = employeeSpec(plan.employee);
    const requestedAt = performedAt(spec.protocol, 15);
    const studyAt = addMinutes(requestedAt, 40);
    const id = radiologyRequestId(spec.key);
    let orthanc: { patientId: string; studyId: string; uid: string } | null = null;
    if (spec.study && ctx.orthanc) {
      const studyUid = dicomUid(`study:${spec.key}`);
      const birth = birthDateOf(plan.employee);
      const dicom = buildDicom({
        studyInstanceUid: studyUid,
        seriesInstanceUid: dicomUid(`series:${spec.key}`),
        sopInstanceUid: dicomUid(`sop:${spec.key}`),
        patientId: employee.passport ?? employeeId(plan.employee),
        patientName:
          `${employee.last.toLocaleUpperCase('tr-TR')}^${employee.first.toLocaleUpperCase('tr-TR')}`
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^A-Z^ -]/g, ''),
        patientBirthDate: birth.toISOString().slice(0, 10).replace(/-/g, ''),
        patientSex: employee.gender === 'MALE' ? 'M' : 'F',
        studyDate: studyAt.toISOString().slice(0, 10).replace(/-/g, ''),
        studyTime: studyAt.toISOString().slice(11, 19).replace(/:/g, ''),
        accessionNumber: `ACC${plan.year}${String(plan.sequence).padStart(4, '0')}`,
        studyDescription: spec.study.description ?? 'CHEST PA',
        modality: spec.modality === 'DX' ? 'DX' : 'CR',
        bodyPart: spec.bodyPart,
        image: chestPixels({ seed: spec.key, opacityDensity: spec.study.opacityDensity }),
      });
      try {
        const result = await ctx.orthanc.uploadInstance(dicom);
        orthanc = { patientId: result.ParentPatient, studyId: result.ParentStudy, uid: studyUid };
        uploaded += 1;
      } catch (error) {
        console.warn(`⚠ Orthanc upload failed for ${spec.key}: ${(error as Error).message}`);
      }
    }
    const reported = spec.status === 'REPORTED';
    const done = reported || spec.status === 'COMPLETED';
    await ctx.prisma.radiologyRequest.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        employeeId: employeeId(plan.employee),
        examinationId: plan.exam ? uid(`exam:${spec.protocol}`) : null,
        modality: spec.modality,
        status: spec.status,
        bodyPart: spec.bodyPart,
        clinicalInfo: spec.clinicalInfo,
        orthancPatientId: orthanc?.patientId ?? null,
        orthancStudyId: orthanc?.studyId ?? null,
        studyInstanceUid: orthanc?.uid ?? null,
        requestedAt,
        completedAt: done || spec.status === 'IN_PROGRESS' ? studyAt : null,
        reportText: reported ? (spec.report ?? null) : null,
        reportedById: reported ? performer(ctx, spec.reportedBy ?? 'radiologist') : null,
        reportedAt: reported ? addMinutes(studyAt, 180) : null,
        createdAt: requestedAt,
      },
      update: {
        orthancPatientId: orthanc?.patientId ?? null,
        orthancStudyId: orthanc?.studyId ?? null,
        studyInstanceUid: orthanc?.uid ?? null,
      },
    });
  }
  console.log(`✔ ${RADIOLOGY.length} radiology requests (${uploaded} DICOM studies in Orthanc)`);
}

interface PneumoSpec {
  key: string;
  protocol: string;
  request: string;
  reader: 'physician' | 'radiologist';
  readerRole: string;
  filmQuality: number;
  qualityComment?: string;
  profusion: string;
  shapePrimary?: string;
  shapeSecondary?: string;
  zones?: string[];
  largeOpacity?: string;
  pleuralPlaques?: boolean;
  plaqueCalcification?: boolean;
  diffuseThickening?: boolean;
  costophrenicObliteration?: string[];
  symbols?: string[];
  result: $Enums.PneumoconiosisResult;
  comment?: string;
  offsetMinutes: number;
}

const PNEUMO: PneumoSpec[] = [
  {
    key: 'n24-1',
    protocol: 'p24-1',
    request: 'r24-1',
    reader: 'physician',
    readerRole: 'A okuyucu',
    filmQuality: 1,
    profusion: '0/0',
    result: 'NEGATIVE',
    offsetMinutes: 200,
    comment: 'Bazal film; küçük opasite yok.',
  },
  {
    key: 'n26-1a',
    protocol: 'p26-1',
    request: 'r26-1',
    reader: 'physician',
    readerRole: 'A okuyucu',
    filmQuality: 2,
    qualityComment: 'Hafif ekspiryum',
    profusion: '1/0',
    shapePrimary: 'p',
    shapeSecondary: 'q',
    zones: ['RU', 'RM', 'LU'],
    largeOpacity: '0',
    symbols: [],
    result: 'POSITIVE',
    offsetMinutes: 220,
    comment: 'Üst zonlarda p/q; 2024 bazaline göre progresyon. B okuyucu ile uzlaşı istendi.',
  },
  {
    key: 'n26-1b',
    protocol: 'p26-1',
    request: 'r26-1',
    reader: 'radiologist',
    readerRole: 'B okuyucu',
    filmQuality: 2,
    profusion: '0/1',
    shapePrimary: 'p',
    shapeSecondary: 'p',
    zones: ['RU', 'LU'],
    largeOpacity: '0',
    symbols: [],
    result: 'BORDERLINE',
    offsetMinutes: 1500,
    comment: 'Sınırda profüzyon; 6 ay sonra kontrol filmi.',
  },
  {
    key: 'n26-3',
    protocol: 'p26-3',
    request: 'r26-3',
    reader: 'radiologist',
    readerRole: 'B okuyucu',
    filmQuality: 3,
    qualityComment: 'Düşük penetrasyon',
    profusion: '0/1',
    shapePrimary: 'p',
    shapeSecondary: 'p',
    zones: ['RU'],
    largeOpacity: '0',
    symbols: ['em', 'bu', 'cp'],
    result: 'NEGATIVE',
    offsetMinutes: 240,
    comment: 'Amfizem ve bül; pnömokonyoz açısından negatif.',
  },
  {
    key: 'n25-5',
    protocol: 'p25-5',
    request: 'r25-5',
    reader: 'physician',
    readerRole: 'A okuyucu',
    filmQuality: 1,
    profusion: '0/0',
    result: 'NEGATIVE',
    offsetMinutes: 200,
  },
  {
    key: 'n26-5',
    protocol: 'p26-5',
    request: 'r26-5',
    reader: 'physician',
    readerRole: 'A okuyucu',
    filmQuality: 1,
    profusion: '0/0',
    pleuralPlaques: false,
    result: 'NEGATIVE',
    offsetMinutes: 200,
    comment: 'İşe giriş bazal filmi.',
  },
];

export async function seedPneumoconiosis(ctx: DemoContext): Promise<void> {
  for (const spec of PNEUMO) {
    const plan = protocolPlan(spec.protocol);
    const readAt = performedAt(spec.protocol, spec.offsetMinutes);
    const id = uid(`pneumo:${spec.key}`);
    await ctx.prisma.pneumoconiosisReading.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        employeeId: employeeId(plan.employee),
        protocolId: protocolId(spec.protocol),
        radiologyRequestId: radiologyRequestId(spec.request),
        readAt,
        readerId: performer(ctx, spec.reader),
        readerRole: spec.readerRole,
        filmDate: performedAt(spec.protocol, 55),
        filmQuality: spec.filmQuality,
        qualityComment: spec.qualityComment ?? null,
        profusion: spec.profusion,
        shapePrimary: spec.shapePrimary ?? null,
        shapeSecondary: spec.shapeSecondary ?? null,
        zones: spec.zones ?? [],
        largeOpacity: spec.largeOpacity ?? '0',
        pleuralPlaques: spec.pleuralPlaques ?? false,
        plaqueCalcification: spec.plaqueCalcification ?? false,
        diffuseThickening: spec.diffuseThickening ?? false,
        costophrenicObliteration: spec.costophrenicObliteration ?? [],
        symbols: spec.symbols ?? [],
        result: spec.result,
        comment: spec.comment ?? null,
        createdAt: readAt,
      },
      update: {},
    });
  }
  console.log(`✔ ${PNEUMO.length} pneumoconiosis readings`);
}

// ----------------------------- report summaries ------------------------------

/** One block per test module linked to the protocol, printed on the Ek-2 PDF. */
export async function testSummaries(
  protocolKey: string,
): Promise<Array<{ title: string; lines: string[] }>> {
  const out: Array<{ title: string; lines: string[] }> = [];
  const audio = AUDIOMETRY.find((a) => a.protocol === protocolKey);
  if (audio) {
    const r = analyzeEar(t(audio.right));
    const l = analyzeEar(t(audio.left));
    out.push({
      title: 'Odyometri',
      lines: [
        `Sağ PTA ${r.pta ?? '—'} dB HL (${r.grade?.label ?? '—'})${r.noiseNotch ? ' · gürültü çentiği' : ''}`,
        `Sol PTA ${l.pta ?? '—'} dB HL (${l.grade?.label ?? '—'})${l.noiseNotch ? ' · gürültü çentiği' : ''}`,
        ...(audio.notes ? [audio.notes] : []),
      ],
    });
  }
  const spiro = SPIROMETRY.find((s) => s.protocol === protocolKey);
  if (spiro) {
    const plan = protocolPlan(protocolKey);
    const employee = employeeSpec(plan.employee);
    const at = performedAt(protocolKey, 110);
    const predicted = ecscPredicted(
      employee.gender,
      employee.heightCm,
      ageAt(birthDateOf(plan.employee), at),
    );
    const analysis = analyzeSpirometry(
      {
        fvc: spiro.fvc,
        fev1: spiro.fev1,
        fvcPredicted: predicted?.fvc,
        fev1Predicted: predicted?.fev1,
        postFvc: spiro.postFvc,
        postFev1: spiro.postFev1,
      },
      {
        sex: employee.gender,
        heightCm: employee.heightCm,
        ageYears: ageAt(birthDateOf(plan.employee), at),
      },
    );
    out.push({
      title: 'Spirometri',
      lines: [
        `FVC ${spiro.fvc} L (%${analysis.fvcPercent ?? '—'}) · FEV1 ${spiro.fev1} L (%${analysis.fev1Percent ?? '—'}) · FEV1/FVC %${analysis.ratio ?? '—'}`,
        `Patern: ${analysis.pattern ?? '—'}${analysis.severity ? ` (${analysis.severity.label})` : ''}`,
        ...(spiro.comment ? [spiro.comment] : []),
      ],
    });
  }
  const ecg = ECG.find((e) => e.protocol === protocolKey);
  if (ecg)
    out.push({
      title: 'EKG',
      lines: [
        `${ecg.heartRate}/dk · ${ecg.rhythm} · PR ${ecg.pr} ms · QRS ${ecg.qrs} ms · QTc ${ecg.qtc ?? bazettQtc(ecg.qt, ecg.heartRate)} ms · aks ${ecg.axis}°`,
        `Yorum: ${ecg.interpretation}${ecg.findings?.length ? ` · ${ecg.findings.join(', ')}` : ''}`,
        ...(ecg.comment ? [ecg.comment] : []),
      ],
    });
  const eye = EYE.find((e) => e.protocol === protocolKey);
  if (eye)
    out.push({
      title: 'Göz',
      lines: [
        `Uzak sağ ${eye.far[0]} / sol ${eye.far[1]}${eye.corrected ? ` (düzeltilmiş ${eye.corrected[0]} / ${eye.corrected[1]})` : ''}`,
        `Renk görme: ${eye.ishihara ? `Ishihara ${eye.ishihara[0]}/${eye.ishihara[1]}` : '—'} · Görme alanı: ${eye.visualField ?? 'NOT_TESTED'}`,
        ...(eye.findings ? [eye.findings] : []),
      ],
    });
  const rad = RADIOLOGY.filter((r) => r.protocol === protocolKey && r.status !== 'CANCELLED');
  for (const r of rad)
    out.push({
      title: `Radyoloji · ${r.modality} ${r.bodyPart}`,
      lines: r.report ? r.report.split('\n').filter(Boolean) : [`Durum: ${r.status}`],
    });
  const readings = PNEUMO.filter((p) => p.protocol === protocolKey);
  if (readings.length)
    out.push({
      title: 'Pnömokonyoz (ILO 2011)',
      lines: readings.map(
        (p) =>
          `${p.readerRole}: profüzyon ${p.profusion}${p.shapePrimary ? ` ${p.shapePrimary}/${p.shapeSecondary}` : ''}${p.zones?.length ? ` · zon ${p.zones.join(',')}` : ''}${p.symbols?.length ? ` · ${p.symbols.join(' ')}` : ''} → ${p.result}`,
      ),
    });
  return out;
}
