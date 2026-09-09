import {
  type Anamnesis,
  BODY_SYSTEMS,
  EXPOSURES,
  MEASUREMENT_DEFINITIONS,
  type SystemsExam,
} from '@osgb/shared-types';
import { createWriter, formatIstanbul } from '@/modules/signatures/pdf-builder';

const DECISION_LABELS: Record<string, string> = {
  PENDING: 'Karar verilmedi',
  FIT: 'ÇALIŞABİLİR',
  FIT_WITH_RESTRICTIONS: 'ŞARTLI ÇALIŞABİLİR',
  UNFIT: 'ÇALIŞAMAZ',
};
const TYPE_LABELS: Record<string, string> = {
  PRE_EMPLOYMENT: 'İşe Giriş',
  PERIODIC: 'Periyodik',
  RETURN_TO_WORK: 'İşe Dönüş',
  EXIT: 'İşten Ayrılış',
  SPECIAL: 'Erken Kontrol / Özel',
};
const SMOKING: Record<string, string> = {
  NEVER: 'Hiç içmemiş',
  FORMER: 'Bırakmış',
  CURRENT: 'İçiyor',
};
const ALCOHOL: Record<string, string> = {
  NONE: 'Kullanmıyor',
  OCCASIONAL: 'Ara sıra',
  REGULAR: 'Düzenli',
};
const SYSTEM_STATUS: Record<string, string> = {
  NORMAL: 'Normal',
  ABNORMAL: 'Anormal',
  NOT_EXAMINED: 'Bakılmadı',
};

export interface ReportPdfInput {
  organization: { name: string; authorizationNumber: string | null; contact: string };
  reportNo: string;
  examination: {
    type: string;
    performedAt: Date;
    fitnessDecision: string;
    restrictions: string | null;
    findings: string | null;
    conclusion: string | null;
    nextExaminationDue: Date | null;
    anamnesis: Anamnesis;
    systemsExam: SystemsExam;
  };
  patient: {
    fullName: string;
    nationalId: string | null;
    birthDate: Date | null;
    gender: string | null;
    company: string | null;
    occupation: string | null;
    hireDate: Date | null;
  };
  protocolNumber: string | null;
  measurements: Record<string, { value: number }>;
  /** One line per linked test module, already formatted. */
  testSummaries: Array<{ title: string; lines: string[] }>;
  physician: {
    fullName: string;
    specialty: string | null;
    diplomaNumber: string | null;
    signaturePng: Buffer | null;
  };
  approvedAt: Date;
}

function date(value: Date | null): string {
  return value
    ? new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul' }).format(value)
    : '—';
}

/** Ek-2 style examination report; every section is written even when empty so the layout is stable. */
export async function buildReportPdf(input: ReportPdfInput): Promise<Buffer> {
  const { writer: w, doc } = await createWriter({
    title: `${TYPE_LABELS[input.examination.type] ?? input.examination.type} Muayene Raporu`,
    subject: input.patient.fullName,
    footer: `Rapor No: ${input.reportNo} · ${input.organization.name}${input.organization.authorizationNumber ? ` · Yetki No ${input.organization.authorizationNumber}` : ''}`,
  });
  const e = input.examination;
  w.text(input.organization.name, { size: 9, color: undefined });
  w.text(`${TYPE_LABELS[e.type] ?? e.type} Sağlık Muayene Raporu`, { size: 14, bold: true });
  w.text(
    `Muayene tarihi: ${formatIstanbul(e.performedAt)}${input.protocolNumber ? ` · Protokol ${input.protocolNumber}` : ''} · Rapor No ${input.reportNo}`,
    { size: 8, gapAfter: 4 },
  );
  w.rule();

  w.text('A. Çalışan bilgileri', { bold: true, gapAfter: 2 });
  w.keyValue('Ad Soyad', input.patient.fullName);
  w.keyValue('T.C. Kimlik No', input.patient.nationalId ?? '—');
  w.keyValue(
    'Doğum tarihi / cinsiyet',
    `${date(input.patient.birthDate)} / ${input.patient.gender === 'MALE' ? 'Erkek' : input.patient.gender === 'FEMALE' ? 'Kadın' : '—'}`,
  );
  w.keyValue('İşyeri', input.patient.company ?? '—');
  w.keyValue('Görev / meslek', input.patient.occupation ?? '—');
  w.keyValue('İşe giriş tarihi', date(input.patient.hireDate));
  w.rule();

  const a = e.anamnesis;
  w.text('B. Anamnez ve çalışma ortamı', { bold: true, gapAfter: 2 });
  w.keyValue('Yakınma', a.complaints ?? '—');
  w.keyValue('Geçirilmiş hastalıklar', a.pastIllnesses ?? '—');
  w.keyValue('Ameliyatlar', a.surgeries ?? '—');
  w.keyValue('Soygeçmiş', a.familyHistory ?? '—');
  w.keyValue('Sürekli ilaç', a.medications ?? '—');
  w.keyValue('Alerji', a.allergies ?? '—');
  w.keyValue(
    'Sigara',
    `${(a.smoking && SMOKING[a.smoking]) ?? '—'}${a.packYears ? ` (${a.packYears} paket-yıl)` : ''}`,
  );
  w.keyValue('Alkol', (a.alcohol && ALCOHOL[a.alcohol]) ?? '—');
  w.keyValue('Çalışma öyküsü', a.occupationalHistory ?? '—');
  w.keyValue(
    'Maruziyetler',
    (a.exposures ?? []).map((k) => EXPOSURES.find((x) => x.key === k)?.label ?? k).join(', ') ||
      '—',
  );
  w.rule();

  w.text('C. Fizik muayene', { bold: true, gapAfter: 2 });
  const vitals = ['HEIGHT', 'WEIGHT', 'BMI', 'SYSTOLIC', 'DIASTOLIC', 'PULSE', 'SPO2']
    .map((key) => {
      const def = MEASUREMENT_DEFINITIONS.find((d) => d.key === key);
      const m = input.measurements[key];
      return def && m ? `${def.label}: ${m.value.toLocaleString('tr-TR')} ${def.unit}` : null;
    })
    .filter(Boolean)
    .join(' · ');
  w.keyValue('Vital bulgular', vitals || '—');
  for (const system of BODY_SYSTEMS) {
    const finding = e.systemsExam[system.key];
    w.keyValue(
      system.label,
      finding
        ? `${SYSTEM_STATUS[finding.status]}${finding.note ? ` — ${finding.note}` : ''}`
        : 'Bakılmadı',
    );
  }
  if (e.findings) w.keyValue('Diğer bulgular', e.findings);
  w.rule();

  w.text('D. Laboratuvar ve tetkikler', { bold: true, gapAfter: 2 });
  if (input.testSummaries.length === 0) w.text('Kayıtlı tetkik yok.', { gapAfter: 4 });
  for (const summary of input.testSummaries) w.keyValue(summary.title, summary.lines.join(' · '));
  w.rule();

  w.text('E. Kanaat', { bold: true, gapAfter: 2 });
  w.keyValue('Karar', DECISION_LABELS[e.fitnessDecision] ?? e.fitnessDecision);
  if (e.restrictions) w.keyValue('Şartlar / kısıtlamalar', e.restrictions);
  w.keyValue('Sonuç', e.conclusion ?? '—');
  w.keyValue('Sonraki muayene', date(e.nextExaminationDue));
  w.text('', { gapAfter: 8 });
  const caption = [
    input.physician.fullName,
    [
      input.physician.specialty,
      input.physician.diplomaNumber ? `Diploma No ${input.physician.diplomaNumber}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    `Onay: ${formatIstanbul(input.approvedAt)}`,
  ].filter((line): line is string => typeof line === 'string' && line !== '');
  if (input.physician.signaturePng) await w.image(input.physician.signaturePng, caption);
  else for (const line of caption) w.text(line, { size: 9 });
  return Buffer.from(await doc.save());
}
