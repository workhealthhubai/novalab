/* eslint-disable no-console */
/**
 * Demo seed, part 2: KVKK consent templates (with a superseded version), patient consents in all
 * states and signature-pad proofs with real PDFs (Belge İmza).
 */
import { createHash } from 'node:crypto';
import type { $Enums } from '../../src/generated/prisma/client';
import { buildConsentPdf, stampPdf } from '../../src/modules/signatures/pdf-builder';
import { createDocument, type DemoContext, simplePdf, USER_AGENTS } from './demo-context';
import { birthDateOf, employeeId, employeeSpec, EMPLOYEES } from './demo-definitions';
import { daysAgo, pick, signaturePng, tcKimlikNo, uid } from './lib';

const templateId = (type: string, version: number) => uid(`consent-template:${type}:${version}`);

const TEMPLATES: Array<{
  type: $Enums.ConsentType;
  version: number;
  title: string;
  body: string;
  effectiveDaysAgo: number;
  isActive: boolean;
}> = [
  {
    type: 'DISCLOSURE',
    version: 1,
    title: 'KVKK Aydınlatma Metni',
    body: '{{KURUM_ADI}} olarak 6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca kişisel verilerinizi iş sağlığı ve güvenliği hizmetlerinin yürütülmesi amacıyla işlemekteyiz. (Eski sürüm)',
    effectiveDaysAgo: 400,
    isActive: false,
  },
  {
    type: 'DISCLOSURE',
    version: 2,
    title: 'KVKK Aydınlatma Metni',
    body: 'Veri sorumlusu {{KURUM_ADI}} ({{KURUM_ILETISIM}}) olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında kişisel verilerinizi; 6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve ilgili yönetmelikler gereği işe giriş, periyodik, işe dönüş ve işten ayrılış sağlık gözetimi hizmetlerinin sunulması, raporların düzenlenmesi ve yasal saklama yükümlülüklerinin yerine getirilmesi amaçlarıyla işlemekteyiz.\n\nVerileriniz işvereninizle yalnızca çalışabilirlik kararı düzeyinde, Sağlık Bakanlığı ve SGK ile mevzuatın öngördüğü ölçüde paylaşılır. KVKK m.11 kapsamındaki haklarınızı kvkk@demo-osgb.com.tr adresine başvurarak kullanabilirsiniz.',
    effectiveDaysAgo: 120,
    isActive: true,
  },
  {
    type: 'EXPLICIT_CONSENT',
    version: 1,
    title: 'Açık Rıza Beyanı',
    body: 'Aydınlatma metnini okudum ve anladım. Kişisel verilerimin {{KURUM_ADI}} tarafından belirtilen amaçlarla işlenmesine, yurt içindeki yetkili kurumlar ve işverenimle mevzuat çerçevesinde paylaşılmasına açık rıza gösteriyorum.',
    effectiveDaysAgo: 120,
    isActive: true,
  },
  {
    type: 'HEALTH_DATA',
    version: 1,
    title: 'Özel Nitelikli Kişisel Veri (Sağlık Verisi) Rızası',
    body: 'Muayene bulguları, laboratuvar ve görüntüleme sonuçları, odyometri, spirometri, EKG ve göz muayenesi kayıtları dâhil sağlık verilerimin {{KURUM_ADI}} işyeri hekimi ve yetkili sağlık personeli tarafından işlenmesine, elektronik ortamda saklanmasına ve sağlık raporu düzenlenmesi amacıyla kullanılmasına açık rıza veriyorum.',
    effectiveDaysAgo: 120,
    isActive: true,
  },
  {
    type: 'COMMUNICATION',
    version: 1,
    title: 'Ticari Elektronik İleti ve İletişim İzni',
    body: 'Randevu hatırlatmaları, periyodik muayene bildirimleri ve rapor teslim bilgilendirmelerinin tarafıma SMS ve e-posta yoluyla gönderilmesine izin veriyorum. Bu izni dilediğim zaman geri çekebileceğimi biliyorum.',
    effectiveDaysAgo: 120,
    isActive: true,
  },
];

const templateIdByType = new Map<string, string>();

export async function seedConsentTemplates(ctx: DemoContext): Promise<void> {
  for (const t of TEMPLATES) {
    const id = templateId(t.type, t.version);
    await ctx.prisma.consentTemplate.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        type: t.type,
        version: t.version,
        title: t.title,
        body: t.body,
        effectiveFrom: daysAgo(t.effectiveDaysAgo),
        isActive: t.isActive,
        createdById: ctx.users.admin.id,
        createdAt: daysAgo(t.effectiveDaysAgo),
      },
      update: {},
    });
    if (t.isActive) templateIdByType.set(t.type, id);
  }
  console.log(`✔ ${TEMPLATES.length} consent templates`);
}

interface ConsentPlan {
  employee: string;
  /** Types given; DISCLOSURE_V1 marks the outdated version. */
  types: Array<$Enums.ConsentType | 'DISCLOSURE_V1'>;
  method: $Enums.ConsentMethod;
  daysAgo: number;
  withdrawn?: $Enums.ConsentType;
}

const ALL: $Enums.ConsentType[] = [
  'DISCLOSURE',
  'EXPLICIT_CONSENT',
  'HEALTH_DATA',
  'COMMUNICATION',
];

const PLANS: ConsentPlan[] = [
  { employee: 'mehmet-kaya', types: ALL, method: 'SIGNATURE_PAD', daysAgo: 20 },
  {
    employee: 'ayse-yilmaz',
    types: ['DISCLOSURE', 'HEALTH_DATA'],
    method: 'SIGNATURE_PAD',
    daysAgo: 25,
  },
  {
    employee: 'ayse-yilmaz',
    types: ['EXPLICIT_CONSENT', 'COMMUNICATION'],
    method: 'ELECTRONIC',
    daysAgo: 25,
  },
  { employee: 'elif-koc', types: ALL, method: 'SIGNATURE_PAD', daysAgo: 10 },
  {
    employee: 'can-aksoy',
    types: ['DISCLOSURE', 'EXPLICIT_CONSENT'],
    method: 'SIGNATURE_PAD',
    daysAgo: 8,
  },
  { employee: 'can-aksoy', types: ['HEALTH_DATA'], method: 'PAPER', daysAgo: 8 },
  {
    employee: 'hasan-demir',
    types: ['DISCLOSURE_V1', 'EXPLICIT_CONSENT', 'HEALTH_DATA', 'COMMUNICATION'],
    method: 'PAPER',
    daysAgo: 180,
  },
  {
    employee: 'fatma-sahin',
    types: ['DISCLOSURE_V1', 'EXPLICIT_CONSENT', 'HEALTH_DATA'],
    method: 'PAPER',
    daysAgo: 280,
  },
  { employee: 'ali-ozturk', types: ALL, method: 'PAPER', daysAgo: 12 },
  { employee: 'mustafa-arslan', types: ALL, method: 'PAPER', daysAgo: 3 },
  {
    employee: 'huseyin-dogan',
    types: ['DISCLOSURE', 'EXPLICIT_CONSENT', 'HEALTH_DATA'],
    method: 'PAPER',
    daysAgo: 30,
  },
  { employee: 'zeynep-kurt', types: ALL, method: 'ELECTRONIC', daysAgo: 60 },
  {
    employee: 'osman-yildirim',
    types: ALL,
    method: 'PAPER',
    daysAgo: 250,
    withdrawn: 'COMMUNICATION',
  },
  { employee: 'yusuf-kilic', types: ALL, method: 'PAPER', daysAgo: 15 },
  { employee: 'ramazan-gunes', types: ALL, method: 'PAPER', daysAgo: 150 },
  {
    employee: 'serkan-bulut',
    types: ['DISCLOSURE', 'EXPLICIT_CONSENT', 'HEALTH_DATA'],
    method: 'VERBAL',
    daysAgo: 2,
  },
  { employee: 'nur-simsek', types: ALL, method: 'PAPER', daysAgo: 120 },
  { employee: 'kerem-uslu', types: ALL, method: 'PAPER', daysAgo: 40 },
  { employee: 'deniz-kara', types: ALL, method: 'ELECTRONIC', daysAgo: 60 },
  {
    employee: 'emine-celik',
    types: ['DISCLOSURE', 'EXPLICIT_CONSENT'],
    method: 'PAPER',
    daysAgo: 1,
  },
  {
    employee: 'ahmed-alhassan',
    types: ['DISCLOSURE', 'EXPLICIT_CONSENT', 'HEALTH_DATA'],
    method: 'PAPER',
    daysAgo: 90,
  },
  { employee: 'selin-yildiz', types: ALL, method: 'ELECTRONIC', daysAgo: 70 },
  // Patients without any consent: ahmet-polat, mahmut-kilinc, burak-erdogan, hatice-oz, merve-aksoy,
  // gul-aslan, volkan-tas, emre-sari, sevgi-tekin, ibrahim-aydin → "Alınmadı" on the KVKK screen.
];

export async function seedConsents(ctx: DemoContext): Promise<void> {
  const { prisma, tenantId } = ctx;
  let consents = 0;
  let signed = 0;
  for (const plan of PLANS) {
    const spec = employeeSpec(plan.employee);
    const empId = employeeId(plan.employee);
    const givenAt = daysAgo(plan.daysAgo, 9 + (consents % 6), (consents * 7) % 60);
    for (const entry of plan.types) {
      const type: $Enums.ConsentType = entry === 'DISCLOSURE_V1' ? 'DISCLOSURE' : entry;
      const tId =
        entry === 'DISCLOSURE_V1' ? templateId('DISCLOSURE', 1) : templateIdByType.get(type)!;
      const template = TEMPLATES.find((t) => templateId(t.type, t.version) === tId)!;
      const consentId = uid(`consent:${plan.employee}:${type}:${template.version}`);
      const collectorId = pick(consentId, [
        ctx.users.nurse.id,
        ctx.users.clerk.id,
        ctx.users.admin.id,
      ]);
      const withdrawn = plan.withdrawn === type;

      let documentId: string | null = null;
      let signatureData: { key: string; sha256: string } | null = null;
      if (plan.method === 'SIGNATURE_PAD' && ctx.storage) {
        const documentNo = uid(`docno:${consentId}`);
        const png = await signaturePng(`${spec.first} ${spec.last}:${type}`, 420, 160);
        const orgName = `${ctx.tenantName} Ortak Sağlık ve Güvenlik Birimi Ltd. Şti.`;
        const pdf = await buildConsentPdf({
          organizationName: orgName,
          title: template.title,
          version: template.version,
          body: template.body
            .replace(/\{\{\s*KURUM_ADI\s*\}\}/g, orgName)
            .replace(/\{\{\s*KURUM_ILETISIM\s*\}\}/g, 'Kadıköy / İstanbul · 0216 555 01 42'),
          patient: {
            fullName: `${spec.first} ${spec.last}`,
            nationalId: spec.passport ? null : tcKimlikNo(plan.employee),
            birthDate: birthDateOf(plan.employee),
          },
          signature: {
            signaturePng: png,
            signerName: `${spec.first} ${spec.last}`,
            signedAt: givenAt,
            collectorName: `${ctx.users.nurse.firstName} ${ctx.users.nurse.lastName}`,
            documentNo,
          },
        });
        const key = `signed-forms/${documentNo}.pdf`;
        const signatureKey = `${tenantId}/signed-forms/${documentNo}-signature.png`;
        await ctx.storage.put(signatureKey, png, 'image/png');
        const document = await createDocument(ctx, {
          key,
          category: 'SIGNED_FORM',
          fileName: `${template.title} v${template.version} - ${spec.first} ${spec.last}.pdf`,
          mimeType: 'application/pdf',
          body: pdf,
          employeeId: empId,
          uploadedById: ctx.users.nurse.id,
          createdAt: givenAt,
        });
        documentId = document?.id ?? null;
        signatureData = {
          key: signatureKey,
          sha256: createHash('sha256').update(pdf).digest('hex'),
        };
      }

      await prisma.patientConsent.upsert({
        where: { id: consentId },
        create: {
          id: consentId,
          tenantId,
          employeeId: empId,
          templateId: tId,
          status: withdrawn ? 'WITHDRAWN' : 'GIVEN',
          method: plan.method,
          givenAt,
          withdrawnAt: withdrawn ? daysAgo(Math.floor(plan.daysAgo / 2)) : null,
          withdrawReason: withdrawn
            ? 'Hasta SMS bildirimlerini almak istemediğini beyan etti.'
            : null,
          collectedById: collectorId,
          documentId,
          note:
            plan.method === 'VERBAL' ? 'Acil kayıt; yazılı form sonraki ziyarette alınacak.' : null,
          createdAt: givenAt,
        },
        update: {},
      });
      consents += 1;

      if (documentId && signatureData) {
        await prisma.documentSignature.upsert({
          where: { id: uid(`signature:${consentId}`) },
          create: {
            id: uid(`signature:${consentId}`),
            tenantId,
            documentId,
            employeeId: empId,
            consentId,
            title: `${template.title} v${template.version}`,
            signerName: `${spec.first} ${spec.last}`,
            signedAt: givenAt,
            collectedById: ctx.users.nurse.id,
            signatureKey: signatureData.key,
            sha256: signatureData.sha256,
            ipAddress: '192.168.1.31',
            userAgent: USER_AGENTS.safariIpad,
            createdAt: givenAt,
          },
          update: {},
        });
        signed += 1;
      }
    }
  }

  // Uploaded PDFs stamped on the pad (no consent template behind them).
  const uploads: Array<{ employee: string; title: string; paragraphs: string[]; daysAgo: number }> =
    [
      {
        employee: 'mehmet-kaya',
        title: 'Sağlık Beyan Formu',
        paragraphs: [
          'Çalışan, geçirdiği hastalıklar, sürekli kullandığı ilaçlar ve alerjileri hakkında verdiği bilgilerin doğru olduğunu beyan eder.',
          'Bilinen kronik hastalık: Yok. Sürekli ilaç: Yok. Alerji: Penisilin.',
        ],
        daysAgo: 20,
      },
      {
        employee: 'elif-koc',
        title: 'Kişisel Koruyucu Donanım Teslim Tutanağı',
        paragraphs: [
          'Aşağıdaki kişisel koruyucu donanımlar çalışana teslim edilmiştir: yarım yüz maske (A2P3 filtreli), nitril eldiven, koruyucu gözlük, iş ayakkabısı.',
          'Çalışan, donanımı talimatlara uygun kullanacağını ve hasar durumunda bildireceğini kabul eder.',
        ],
        daysAgo: 10,
      },
      {
        employee: 'osman-yildirim',
        title: 'Periyodik Muayene Bilgilendirme Formu',
        paragraphs: [
          'Çalışan, periyodik muayene kapsamı ve sonuçlarının işverene yalnızca çalışabilirlik kararı düzeyinde bildirileceği konusunda bilgilendirilmiştir.',
        ],
        daysAgo: 250,
      },
    ];
  if (ctx.storage) {
    for (const up of uploads) {
      const spec = employeeSpec(up.employee);
      const empId = employeeId(up.employee);
      const signedAt = daysAgo(up.daysAgo, 11, 20);
      const documentNo = uid(`docno:upload:${up.employee}:${up.title}`);
      const png = await signaturePng(`${spec.first} ${spec.last}:${up.title}`, 420, 160);
      const base = await simplePdf(up.title, up.paragraphs, `Belge No: ${documentNo}`);
      const pdf = await stampPdf(base, {
        signaturePng: png,
        signerName: `${spec.first} ${spec.last}`,
        signedAt,
        collectorName: `${ctx.users.clerk.firstName} ${ctx.users.clerk.lastName}`,
        documentNo,
      });
      const signatureKey = `${tenantId}/signed-forms/${documentNo}-signature.png`;
      await ctx.storage.put(signatureKey, png, 'image/png');
      const document = await createDocument(ctx, {
        key: `signed-forms/${documentNo}.pdf`,
        category: 'SIGNED_FORM',
        fileName: `${up.title} - ${spec.first} ${spec.last}.pdf`,
        mimeType: 'application/pdf',
        body: pdf,
        employeeId: empId,
        uploadedById: ctx.users.clerk.id,
        createdAt: signedAt,
      });
      if (!document) continue;
      await prisma.documentSignature.upsert({
        where: { id: uid(`signature:upload:${documentNo}`) },
        create: {
          id: uid(`signature:upload:${documentNo}`),
          tenantId,
          documentId: document.id,
          employeeId: empId,
          consentId: null,
          title: up.title,
          signerName: `${spec.first} ${spec.last}`,
          signedAt,
          collectedById: ctx.users.clerk.id,
          signatureKey,
          sha256: createHash('sha256').update(pdf).digest('hex'),
          ipAddress: '192.168.1.31',
          userAgent: USER_AGENTS.safariIpad,
          createdAt: signedAt,
        },
        update: {},
      });
      signed += 1;
    }
  }
  const missing = EMPLOYEES.length - new Set(PLANS.map((p) => p.employee)).size;
  console.log(
    `✔ ${consents} patient consents, ${signed} signed documents (${missing} patients without consent)`,
  );
}
