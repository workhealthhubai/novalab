/* eslint-disable no-console */
/**
 * Demo seed, part 5: extra documents (scans, certificates, contracts), appointments, live
 * sessions (Aktif Kullanıcılar) and a month of audit trail (Personel Hareketleri).
 */
import { createHash } from 'node:crypto';
import { AuditAction } from '@osgb/shared-types';
import type { $Enums, Prisma } from '../../src/generated/prisma/client';
import { auditRow, createDocument, type DemoContext, simplePdf, USER_AGENTS } from './demo-context';
import { companyId, employeeId, employeeSpec } from './demo-definitions';
import { examinationId, PROTOCOLS, protocolId } from './demo-plan';
import { radiologyRequestId } from './demo-tests';
import { addMinutes, daysAgo, daysAhead, NOW, uid } from './lib';

// ----------------------------- documents -------------------------------------

export async function seedDocuments(ctx: DemoContext): Promise<void> {
  if (!ctx.storage) return;
  const footer = `${ctx.tenantName} · Demo belge`;
  const files: Array<{
    key: string;
    category: $Enums.DocumentCategory;
    fileName: string;
    title: string;
    paragraphs: string[];
    employee?: string;
    company?: string;
    examination?: string;
    isMedical?: boolean;
    uploadedBy: keyof DemoContext['users'];
    daysAgo: number;
  }> = [
    {
      key: 'scan-kaya-kimlik',
      category: 'SCANNED_DOCUMENT',
      fileName: 'Kimlik fotokopisi - Mehmet Kaya.pdf',
      title: 'T.C. Kimlik Kartı Fotokopisi',
      paragraphs: [
        'Mehmet KAYA · Doğum 12.04.1985 · Seri A12B34567',
        'Kayıt sırasında OCR ile okundu; aslı görüldü.',
      ],
      employee: 'mehmet-kaya',
      uploadedBy: 'clerk',
      daysAgo: 20,
    },
    {
      key: 'scan-alhassan-pasaport',
      category: 'SCANNED_DOCUMENT',
      fileName: 'Pasaport - Ahmed Al-Hassan.pdf',
      title: 'Pasaport ve Çalışma İzni',
      paragraphs: [
        'Pasaport No N01234567 · Çalışma izni 2025-ÇİZ-77812',
        'MRZ taraması ile kayıt.',
      ],
      employee: 'ahmed-alhassan',
      uploadedBy: 'clerk',
      daysAgo: 90,
    },
    {
      key: 'cert-kaya-myb',
      category: 'CERTIFICATE',
      fileName: 'Mesleki Yeterlilik Belgesi - Mehmet Kaya.pdf',
      title: 'Mesleki Yeterlilik Belgesi',
      paragraphs: [
        '11UY0010-3 Çelik Kaynakçısı (Seviye 3) · Belge No MYK-2019-118203',
        'Geçerlilik: 5 yıl (2029)',
      ],
      employee: 'mehmet-kaya',
      uploadedBy: 'safety',
      daysAgo: 60,
    },
    {
      key: 'cert-demir-isg',
      category: 'CERTIFICATE',
      fileName: 'Temel İSG Eğitimi Katılım Belgeleri - Demir Çelik 2026.pdf',
      title: 'Temel İSG Eğitimi Katılım Belgeleri',
      paragraphs: [
        'Demir Çelik Sanayi A.Ş. · 16 saat temel İSG eğitimi · 42 katılımcı',
        'Eğitmen: Burak Çelik (A sınıfı İSG uzmanı)',
      ],
      company: 'demir',
      uploadedBy: 'safety',
      daysAgo: 35,
    },
    {
      key: 'att-demir-sozlesme',
      category: 'ATTACHMENT',
      fileName: 'OSGB Hizmet Sözleşmesi 2026 - Demir Çelik.pdf',
      title: 'OSGB Hizmet Sözleşmesi',
      paragraphs: [
        'Taraflar: Demo OSGB ve Demir Çelik Sanayi A.Ş.',
        'Kapsam: işyeri hekimliği (ayda 40 saat), İSG uzmanlığı (ayda 60 saat), diğer sağlık personeli.',
        'Süre: 01.01.2026 – 31.12.2026',
      ],
      company: 'demir',
      uploadedBy: 'admin',
      daysAgo: 100,
    },
    {
      key: 'att-mobilya-risk',
      category: 'OTHER',
      fileName: 'Risk Değerlendirme Raporu 2026 - Anadolu Mobilya.pdf',
      title: 'Risk Değerlendirme Raporu',
      paragraphs: [
        'Anadolu Mobilya Kayseri OSB Atölye · Fine-Kinney yöntemi',
        'Öncelikli riskler: ahşap tozu (solunum), gürültü (>85 dB), yangın (vernik deposu).',
      ],
      company: 'mobilya',
      uploadedBy: 'safety',
      daysAgo: 45,
    },
    {
      key: 'att-dogan-hastane',
      category: 'ATTACHMENT',
      fileName: 'Göğüs Hastalıkları Epikrizi - Hüseyin Doğan.pdf',
      title: 'Hastane Epikrizi',
      paragraphs: [
        'KOAH alevlenmesi nedeniyle 12 gün yatış. Taburculuk tedavisi: tiotropium, salbutamol.',
        '45 gün istirahat raporu.',
      ],
      employee: 'huseyin-dogan',
      examination: 'p26-3',
      isMedical: true,
      uploadedBy: 'physician',
      daysAgo: 31,
    },
    {
      key: 'att-sahin-konsultasyon',
      category: 'ATTACHMENT',
      fileName: 'Göğüs Hastalıkları Konsültasyon - Fatma Şahin.pdf',
      title: 'Konsültasyon Notu',
      paragraphs: [
        'Reversibl hava yolu obstrüksiyonu; mesleki astım ön tanısı. İnhaler tedavi başlandı; maruziyetin azaltılması önerildi.',
      ],
      employee: 'fatma-sahin',
      examination: 'p25-2',
      isMedical: true,
      uploadedBy: 'physician',
      daysAgo: 270,
    },
    {
      key: 'lab-koc-sonuc',
      category: 'ATTACHMENT',
      fileName: 'Laboratuvar Sonuçları - Elif Koç.pdf',
      title: 'Laboratuvar Sonuç Raporu',
      paragraphs: [
        'Hemogram: Hb 13.2 g/dL, WBC 6.4, PLT 245',
        'Açlık glukozu 86 mg/dL · ALT 18 U/L · AST 21 U/L',
        'Tam idrar: normal',
      ],
      employee: 'elif-koc',
      examination: 'p26-5',
      isMedical: true,
      uploadedBy: 'nurse',
      daysAgo: 10,
    },
    {
      key: 'lab-simsek-portor',
      category: 'ATTACHMENT',
      fileName: 'Portör Tetkik Sonuçları - Nur Şimşek.pdf',
      title: 'Portör Tetkik Sonuçları',
      paragraphs: [
        'Gaita kültürü: Salmonella/Shigella üremedi · Parazit: negatif · Boğaz kültürü: normal flora',
        'HBsAg: negatif',
      ],
      employee: 'nur-simsek',
      examination: 'p25-7',
      isMedical: true,
      uploadedBy: 'nurse',
      daysAgo: 119,
    },
  ];
  for (const f of files) {
    await createDocument(ctx, {
      key: `documents/${uid(`doc:${f.key}`)}-${f.fileName.replace(/[^\w.-]+/g, '_')}`,
      category: f.category,
      fileName: f.fileName,
      mimeType: 'application/pdf',
      body: await simplePdf(f.title, f.paragraphs, footer),
      isMedical: f.isMedical ?? false,
      employeeId: f.employee ? employeeId(f.employee) : null,
      companyId: f.company ? companyId(f.company) : null,
      examinationId: f.examination ? examinationId(f.examination) : null,
      uploadedById: ctx.users[f.uploadedBy].id,
      createdAt: daysAgo(f.daysAgo, 14, 10),
    });
  }
  console.log(`✔ ${files.length} additional documents`);
}

// ----------------------------- appointments ----------------------------------

export async function seedAppointments(ctx: DemoContext): Promise<void> {
  const rows: Array<{
    key: string;
    type: $Enums.AppointmentType;
    status: $Enums.AppointmentStatus;
    title: string;
    startsAt: Date;
    minutes: number;
    location?: string;
    notes?: string;
    employee?: string;
    company?: string;
    examination?: string;
    radiology?: string;
    createdBy: keyof DemoContext['users'];
  }> = [
    {
      key: 'a1',
      type: 'EXAMINATION',
      status: 'SCHEDULED',
      title: 'İşe giriş muayenesi - Ahmet Polat',
      startsAt: daysAhead(1, 9, 30),
      minutes: 30,
      location: 'Muayene Odası 1',
      employee: 'ahmet-polat',
      examination: 'p26-10',
      createdBy: 'clerk',
    },
    {
      key: 'a2',
      type: 'RADIOLOGY',
      status: 'CONFIRMED',
      title: 'PA akciğer grafisi - Serkan Bulut',
      startsAt: daysAhead(2, 10, 0),
      minutes: 15,
      location: 'Radyoloji',
      employee: 'serkan-bulut',
      radiology: 'r26-13',
      createdBy: 'nurse',
    },
    {
      key: 'a3',
      type: 'CONSULTATION',
      status: 'SCHEDULED',
      title: 'Sürücü sağlık raporu görüşmesi - Mahmut Kılınç',
      startsAt: daysAhead(0, 15, 0),
      minutes: 20,
      location: 'Muayene Odası 2',
      employee: 'mahmut-kilinc',
      createdBy: 'clerk',
    },
    {
      key: 'a4',
      type: 'TRAINING',
      status: 'CONFIRMED',
      title: 'Temel İSG Eğitimi (2. grup) - Demir Çelik',
      startsAt: daysAhead(5, 13, 0),
      minutes: 240,
      location: 'Gebze Fabrika eğitim salonu',
      company: 'demir',
      notes: '38 katılımcı; yoklama listesi hazırlanacak.',
      createdBy: 'safety',
    },
    {
      key: 'a5',
      type: 'TRAINING',
      status: 'SCHEDULED',
      title: 'Yangın tatbikatı - Anadolu Mobilya',
      startsAt: daysAhead(12, 10, 0),
      minutes: 120,
      location: 'Kayseri OSB Atölye',
      company: 'mobilya',
      createdBy: 'safety',
    },
    {
      key: 'a6',
      type: 'EXAMINATION',
      status: 'COMPLETED',
      title: 'İşe giriş muayenesi - Emine Çelik',
      startsAt: daysAgo(1, 9, 0),
      minutes: 30,
      location: 'Muayene Odası 1',
      employee: 'emine-celik',
      examination: 'p26-8',
      createdBy: 'clerk',
    },
    {
      key: 'a7',
      type: 'EXAMINATION',
      status: 'COMPLETED',
      title: 'Periyodik muayene - Mustafa Arslan',
      startsAt: daysAgo(3, 9, 0),
      minutes: 30,
      employee: 'mustafa-arslan',
      examination: 'p26-7',
      createdBy: 'nurse',
    },
    {
      key: 'a8',
      type: 'EXAMINATION',
      status: 'CANCELLED',
      title: 'Periyodik muayene - Burak Erdoğan',
      startsAt: daysAgo(5, 11, 0),
      minutes: 30,
      employee: 'burak-erdogan',
      examination: 'p26-9',
      notes: 'Gelmedi; işveren yeni tarih isteyecek.',
      createdBy: 'clerk',
    },
    {
      key: 'a9',
      type: 'EXAMINATION',
      status: 'NO_SHOW',
      title: 'Periyodik muayene - Hatice Öz',
      startsAt: daysAgo(7, 14, 0),
      minutes: 30,
      employee: 'hatice-oz',
      createdBy: 'clerk',
    },
    {
      key: 'a10',
      type: 'CONSULTATION',
      status: 'CONFIRMED',
      title: 'Ergonomi değerlendirmesi - Yıldız Yazılım',
      startsAt: daysAhead(9, 14, 0),
      minutes: 90,
      location: 'Maslak Ofis',
      company: 'yazilim',
      createdBy: 'safety',
    },
    {
      key: 'a11',
      type: 'TRAINING',
      status: 'COMPLETED',
      title: 'Hijyen eğitimi - Ege Gıda',
      startsAt: daysAgo(20, 10, 0),
      minutes: 120,
      location: 'Torbalı tesis',
      company: 'gida',
      createdBy: 'physician',
    },
    {
      key: 'a12',
      type: 'EXAMINATION',
      status: 'SCHEDULED',
      title: 'Periyodik muayene - Nur Şimşek',
      startsAt: daysAhead(30, 9, 0),
      minutes: 30,
      employee: 'nur-simsek',
      company: 'gida',
      createdBy: 'nurse',
    },
    {
      key: 'a13',
      type: 'OTHER',
      status: 'SCHEDULED',
      title: 'Saha ziyareti - Marmara Lojistik (İSG kurulu)',
      startsAt: daysAhead(3, 11, 0),
      minutes: 120,
      location: 'Hadımköy Depo',
      company: 'lojistik',
      createdBy: 'safety',
    },
  ];
  for (const r of rows) {
    const spec = r.employee ? employeeSpec(r.employee) : null;
    await ctx.prisma.appointment.upsert({
      where: { id: uid(`appointment:${r.key}`) },
      create: {
        id: uid(`appointment:${r.key}`),
        tenantId: ctx.tenantId,
        type: r.type,
        status: r.status,
        title: r.title,
        startsAt: r.startsAt,
        endsAt: addMinutes(r.startsAt, r.minutes),
        location: r.location ?? null,
        notes: r.notes ?? null,
        employeeId: r.employee ? employeeId(r.employee) : null,
        companyId: r.company
          ? companyId(r.company)
          : spec?.company
            ? companyId(spec.company)
            : null,
        examinationId: r.examination ? examinationId(r.examination) : null,
        radiologyRequestId: r.radiology ? radiologyRequestId(r.radiology) : null,
        createdById: ctx.users[r.createdBy].id,
        createdAt: addMinutes(r.startsAt, -60 * 24 * 3),
      },
      update: {},
    });
  }
  console.log(`✔ ${rows.length} appointments`);
}

// ----------------------------- sessions --------------------------------------

export async function seedSessions(ctx: DemoContext): Promise<void> {
  const rows: Array<{
    key: string;
    user: keyof DemoContext['users'];
    agent: string;
    ip: string;
    createdAt: Date;
    revoked?: boolean;
    expired?: boolean;
  }> = [
    {
      key: 's1',
      user: 'admin',
      agent: USER_AGENTS.chromeMac,
      ip: '192.168.1.10',
      createdAt: addMinutes(NOW, -120),
    },
    {
      key: 's2',
      user: 'physician',
      agent: USER_AGENTS.safariIpad,
      ip: '192.168.1.31',
      createdAt: addMinutes(NOW, -30),
    },
    {
      key: 's3',
      user: 'nurse',
      agent: USER_AGENTS.edgeWindows,
      ip: '192.168.1.24',
      createdAt: addMinutes(NOW, -10),
    },
    {
      key: 's4',
      user: 'clerk',
      agent: USER_AGENTS.edgeWindows,
      ip: '192.168.1.25',
      createdAt: addMinutes(NOW, -55),
    },
    {
      key: 's5',
      user: 'safety',
      agent: USER_AGENTS.firefoxLinux,
      ip: '85.105.22.7',
      createdAt: daysAgo(2, 10, 15),
      revoked: true,
    },
    {
      key: 's6',
      user: 'company',
      agent: USER_AGENTS.chromeMac,
      ip: '78.187.14.90',
      createdAt: daysAgo(12, 16, 5),
      expired: true,
    },
  ];
  for (const r of rows) {
    const id = uid(`session:${r.key}`);
    await ctx.prisma.refreshSession.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        userId: ctx.users[r.user].id,
        tokenHash: createHash('sha256')
          .update(`demo-session:${r.key}:${ctx.tenantId}`)
          .digest('hex'),
        userAgent: r.agent,
        ipAddress: r.ip,
        expiresAt: r.expired ? addMinutes(r.createdAt, 60 * 24 * 7) : addMinutes(NOW, 60 * 24 * 7),
        revokedAt: r.revoked ? addMinutes(r.createdAt, 90) : null,
        createdAt: r.createdAt,
      },
      update: {
        tokenHash: createHash('sha256')
          .update(`demo-session:${r.key}:${ctx.tenantId}`)
          .digest('hex'),
      },
    });
  }
  console.log(`✔ ${rows.length} refresh sessions (4 active)`);
}

// ----------------------------- audit trail -----------------------------------

export async function seedAuditLog(ctx: DemoContext): Promise<void> {
  const rows: Prisma.AuditLogCreateManyInput[] = [];
  const u = ctx.users;
  const http = (
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    outcome: 'SUCCESS' | 'FAILURE',
    errorCode?: string,
  ) => ({
    method,
    path,
    statusCode,
    durationMs,
    outcome,
    ...(errorCode ? { errorCode } : {}),
  });

  // Daily logins for the last 30 days.
  for (let d = 30; d >= 0; d -= 1) {
    for (const [user, hour, agent, ip] of [
      ['admin', 7, USER_AGENTS.chromeMac, '192.168.1.10'],
      ['nurse', 8, USER_AGENTS.edgeWindows, '192.168.1.24'],
      ['clerk', 8, USER_AGENTS.edgeWindows, '192.168.1.25'],
      ['physician', 8, USER_AGENTS.safariIpad, '192.168.1.31'],
    ] as const) {
      if (d % (user === 'admin' ? 3 : 1) !== 0) continue;
      const at = daysAgo(d, hour, (d * 7 + user.length) % 60);
      if (at.getDay() === 0 || at.getDay() === 6) continue;
      rows.push(
        auditRow(ctx, {
          at,
          userId: u[user].id,
          action: AuditAction.LOGIN,
          entityType: 'User',
          entityId: u[user].id,
          ipAddress: ip,
          userAgent: agent,
          metadata: http('POST', '/api/auth/login', 200, 180, 'SUCCESS'),
        }),
      );
      if (user !== 'admin')
        rows.push(
          auditRow(ctx, {
            at: addMinutes(at, 9 * 60),
            userId: u[user].id,
            action: AuditAction.LOGOUT,
            entityType: 'User',
            entityId: u[user].id,
            ipAddress: ip,
            userAgent: agent,
          }),
        );
    }
  }
  // Failed logins and a token-reuse detection.
  for (const d of [1, 4, 9, 17]) {
    rows.push(
      auditRow(ctx, {
        at: daysAgo(d, 22, 13),
        userId: null,
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        newValue: { email: 'admin@demo.local', reason: 'INVALID_CREDENTIALS' },
        ipAddress: '45.14.72.201',
        userAgent: USER_AGENTS.firefoxLinux,
        metadata: http('POST', '/api/auth/login', 401, 240, 'FAILURE', 'INVALID_CREDENTIALS'),
      }),
    );
  }
  rows.push(
    auditRow(ctx, {
      at: daysAgo(2, 11, 45),
      userId: u.safety.id,
      action: AuditAction.TOKEN_REUSE_DETECTED,
      entityType: 'RefreshSession',
      entityId: uid('session:s5'),
      newValue: { revokedSessions: 2 },
      ipAddress: '85.105.22.7',
      userAgent: USER_AGENTS.firefoxLinux,
    }),
  );

  // Business changes derived from the visit plan.
  for (const plan of PROTOCOLS) {
    const openedAt = daysAgo(plan.daysAgo, plan.hour ?? 9, (plan.sequence * 11) % 60);
    if (plan.daysAgo > 60) continue;
    const opener = u[plan.openedBy];
    rows.push(
      auditRow(ctx, {
        at: openedAt,
        userId: opener.id,
        action: AuditAction.CREATE,
        entityType: 'Protocol',
        entityId: protocolId(plan.key),
        newValue: {
          protocolNumber: `${plan.year}-${String(plan.sequence).padStart(6, '0')}`,
          type: plan.type,
          employeeId: employeeId(plan.employee),
        },
        ipAddress: '192.168.1.25',
        userAgent: USER_AGENTS.edgeWindows,
      }),
    );
    if (plan.exam) {
      rows.push(
        auditRow(ctx, {
          at: addMinutes(openedAt, 45),
          userId: u.physician.id,
          action: AuditAction.CREATE,
          entityType: 'Examination',
          entityId: examinationId(plan.key),
          newValue: { protocolId: protocolId(plan.key), type: plan.type, source: 'health-report' },
          ipAddress: '192.168.1.31',
          userAgent: USER_AGENTS.safariIpad,
        }),
      );
      rows.push(
        auditRow(ctx, {
          at: addMinutes(openedAt, 50),
          userId: u.physician.id,
          action: AuditAction.MEDICAL_DATA_ACCESS,
          entityType: 'Examination',
          entityId: examinationId(plan.key),
          metadata: { method: 'GET', path: `/api/health-reports/${examinationId(plan.key)}` },
          ipAddress: '192.168.1.31',
          userAgent: USER_AGENTS.safariIpad,
        }),
      );
      if (plan.exam.status === 'APPROVED')
        rows.push(
          auditRow(ctx, {
            at: addMinutes(openedAt, 135),
            userId: u.physician.id,
            action: AuditAction.UPDATE,
            entityType: 'Examination',
            entityId: examinationId(plan.key),
            oldValue: { status: 'IN_PROGRESS' },
            newValue: { status: 'APPROVED', fitnessDecision: plan.exam.decision },
            ipAddress: '192.168.1.31',
            userAgent: USER_AGENTS.safariIpad,
          }),
        );
    }
    for (const [type, state] of Object.entries(plan.items)) {
      if (state !== 'DONE' || type === 'HEALTH_REPORT' || type === 'LAB') continue;
      const entity = {
        AUDIOMETRY: 'AudiometryTest',
        ECG: 'EcgRecord',
        SPIROMETRY: 'SpirometryTest',
        EYE: 'EyeExamination',
        PNEUMOCONIOSIS: 'PneumoconiosisReading',
        RADIOLOGY: 'RadiologyRequest',
      }[type];
      if (!entity) continue;
      rows.push(
        auditRow(ctx, {
          at: addMinutes(openedAt, 60 + type.length * 5),
          userId: u.nurse.id,
          action: AuditAction.CREATE,
          entityType: entity,
          entityId: uid(`${type.toLowerCase()}:${plan.key}`),
          newValue: { protocolId: protocolId(plan.key) },
          ipAddress: '192.168.1.24',
          userAgent: USER_AGENTS.edgeWindows,
        }),
      );
    }
    if (plan.status === 'COMPLETED' && plan.closedBy)
      rows.push(
        auditRow(ctx, {
          at: addMinutes(openedAt, 240),
          userId: u[plan.closedBy].id,
          action: AuditAction.UPDATE,
          entityType: 'Protocol',
          entityId: protocolId(plan.key),
          oldValue: { status: 'IN_PROGRESS' },
          newValue: { status: 'COMPLETED' },
        }),
      );
  }

  // Definitions, patients, documents, exports, failures.
  const extra: Array<Parameters<typeof auditRow>[1]> = [
    {
      at: daysAgo(100, 10, 0),
      userId: u.admin.id,
      action: AuditAction.CREATE,
      entityType: 'Company',
      entityId: companyId('demir'),
      newValue: { name: 'Demir Çelik Sanayi A.Ş.', hazardClass: 'VERY_HAZARDOUS' },
    },
    {
      at: daysAgo(40, 10, 30),
      userId: u.admin.id,
      action: AuditAction.DELETE,
      entityType: 'Company',
      entityId: companyId('kapanan'),
      oldValue: { name: 'Kapanan Tekstil Ltd. Şti.' },
    },
    {
      at: daysAgo(90, 9, 0),
      userId: u.admin.id,
      action: AuditAction.UPDATE,
      entityType: 'OrganizationProfile',
      entityId: uid('organization-profile'),
      oldValue: { logo: false },
      newValue: { logo: true },
    },
    {
      at: daysAgo(80, 11, 0),
      userId: u.admin.id,
      action: AuditAction.UPDATE,
      entityType: 'Physician',
      entityId: ctx.physicians.demir.id,
      newValue: { signature: 'uploaded' },
    },
    {
      at: daysAgo(35, 15, 20),
      userId: u.admin.id,
      action: AuditAction.UPDATE,
      entityType: 'TestDefinition',
      entityId: uid('test:HR-EK2'),
      oldValue: { unitPrice: 400 },
      newValue: { unitPrice: 450 },
    },
    {
      at: daysAgo(3, 9, 5),
      userId: u.admin.id,
      action: AuditAction.CREATE,
      entityType: 'User',
      entityId: uid('user:davetli@demo.local'),
      newValue: { email: 'davetli@demo.local', status: 'INVITED' },
    },
    {
      at: daysAgo(0, 8, 20),
      userId: u.clerk.id,
      action: AuditAction.CREATE,
      entityType: 'Employee',
      entityId: employeeId('ahmet-polat'),
      newValue: { firstName: 'Ahmet', lastName: 'Polat', identityVerificationStatus: 'FAILED' },
      ipAddress: '192.168.1.25',
      userAgent: USER_AGENTS.edgeWindows,
    },
    {
      at: daysAgo(0, 8, 22),
      userId: u.clerk.id,
      action: 'POST /api/identity/verify',
      entityType: 'Identity',
      entityId: employeeId('ahmet-polat'),
      newValue: { nationalId: '[REDACTED]' },
      metadata: http('POST', '/api/identity/verify', 422, 1850, 'FAILURE', 'IDENTITY_MISMATCH'),
      ipAddress: '192.168.1.25',
      userAgent: USER_AGENTS.edgeWindows,
    },
    {
      at: daysAgo(1, 9, 10),
      userId: u.clerk.id,
      action: AuditAction.CREATE,
      entityType: 'Employee',
      entityId: employeeId('emine-celik'),
      newValue: { firstName: 'Emine', lastName: 'Çelik' },
      ipAddress: '192.168.1.25',
      userAgent: USER_AGENTS.edgeWindows,
    },
    {
      at: daysAgo(1, 9, 12),
      userId: u.clerk.id,
      action: 'POST /api/employees/:id/photo',
      entityType: 'Employees',
      entityId: employeeId('emine-celik'),
      metadata: http(
        'POST',
        `/api/employees/${employeeId('emine-celik')}/photo`,
        400,
        95,
        'FAILURE',
        'VALIDATION_ERROR',
      ),
      newValue: { file: '[buffer 12MB]' },
      ipAddress: '192.168.1.25',
      userAgent: USER_AGENTS.edgeWindows,
    },
    {
      at: daysAgo(20, 10, 40),
      userId: u.nurse.id,
      action: AuditAction.CREATE,
      entityType: 'DocumentSignature',
      entityId: uid(`signature:${uid('consent:mehmet-kaya:DISCLOSURE:2')}`),
      newValue: { employeeId: employeeId('mehmet-kaya'), title: 'KVKK Aydınlatma Metni v2' },
      ipAddress: '192.168.1.31',
      userAgent: USER_AGENTS.safariIpad,
    },
    {
      at: daysAgo(125, 14, 0),
      userId: u.nurse.id,
      action: AuditAction.UPDATE,
      entityType: 'PatientConsent',
      entityId: uid('consent:osman-yildirim:COMMUNICATION:1'),
      oldValue: { status: 'GIVEN' },
      newValue: { status: 'WITHDRAWN' },
    },
    {
      at: daysAgo(35, 16, 0),
      userId: u.safety.id,
      action: AuditAction.CREATE,
      entityType: 'Document',
      entityId: uid(
        `document:${ctx.tenantId}/documents/${uid('doc:cert-demir-isg')}-Temel_ISG_Egitimi_Katilim_Belgeleri_-_Demir_Celik_2026.pdf`,
      ),
      newValue: { category: 'CERTIFICATE', companyId: companyId('demir') },
    },
    {
      at: daysAgo(6, 16, 5),
      userId: u.company.id,
      action: AuditAction.EXPORT,
      entityType: 'Report',
      newValue: { report: 'employee-list', companyId: companyId('yazilim'), format: 'xlsx' },
      ipAddress: '78.187.14.90',
    },
    {
      at: daysAgo(15, 17, 30),
      userId: u.admin.id,
      action: AuditAction.EXPORT,
      entityType: 'Report',
      newValue: {
        report: 'protocols',
        from: daysAgo(45).toISOString().slice(0, 10),
        to: daysAgo(15).toISOString().slice(0, 10),
        format: 'csv',
      },
    },
    {
      at: daysAgo(2, 11, 50),
      userId: u.admin.id,
      action: AuditAction.UPDATE,
      entityType: 'RefreshSession',
      entityId: uid('session:s5'),
      newValue: { revoked: true, reason: 'admin' },
    },
    {
      at: daysAgo(30, 9, 30),
      userId: u.admin.id,
      action: 'POST /api/employee-imports',
      entityType: 'EmployeeImport',
      newValue: { fileName: 'demir-celik-personel.xlsx', rows: 12, created: 11, skipped: 1 },
      metadata: http('POST', '/api/employee-imports', 201, 3400, 'SUCCESS'),
    },
    {
      at: daysAgo(12, 13, 0),
      userId: u.physician.id,
      action: AuditAction.UPDATE,
      entityType: 'RadiologyRequest',
      entityId: radiologyRequestId('r26-1'),
      oldValue: { status: 'COMPLETED' },
      newValue: { status: 'REPORTED' },
      ipAddress: '192.168.1.31',
      userAgent: USER_AGENTS.safariIpad,
    },
    {
      at: daysAgo(19, 15, 10),
      userId: u.radiologist.id,
      action: AuditAction.UPDATE,
      entityType: 'RadiologyRequest',
      entityId: radiologyRequestId('r26-1'),
      newValue: { studyInstanceUid: 'linked' },
    },
  ];
  for (const e of extra) rows.push(auditRow(ctx, e));

  rows.sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());
  await ctx.prisma.auditLog.createMany({ data: rows });
  console.log(`✔ ${rows.length} audit log entries`);
}
