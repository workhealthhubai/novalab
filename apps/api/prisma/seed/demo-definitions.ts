/* eslint-disable no-console */
/**
 * Demo seed, part 1: organisation profile, staff users, physicians, occupations, test catalogue,
 * packages, client companies with branches/workplaces and the employee (patient) roster.
 */
import { SYSTEM_ROLES } from '@osgb/shared-types';
import type { $Enums } from '../../src/generated/prisma/client';
import { occupationNameKey } from '../../src/modules/occupations/occupation-name';
import type { DemoContext } from './demo-context';
import {
  daysAgo,
  dateOnly,
  gsm,
  landline,
  logoPng,
  portraitJpeg,
  signaturePng,
  tcKimlikNo,
  uid,
  yearsAgoDate,
} from './lib';

// ----------------------------- organisation ----------------------------------

export async function seedOrganization(ctx: DemoContext): Promise<void> {
  const { prisma, tenantId } = ctx;
  let logoKey: string | null = null;
  if (ctx.storage) {
    logoKey = `${tenantId}/organization/logo-${uid('logo')}.png`;
    await ctx.storage.put(logoKey, await logoPng(ctx.tenantName), 'image/png');
  }
  await prisma.organizationProfile.upsert({
    where: { tenantId },
    create: {
      id: uid('organization-profile'),
      tenantId,
      legalName: `${ctx.tenantName} Ortak Sağlık ve Güvenlik Birimi Ltd. Şti.`,
      taxOffice: 'Kozyatağı',
      taxNumber: '6120458971',
      sgkRegistrationNumber: '2 8631 01 01 1234567 034 01 12',
      authorizationNumber: 'OSGB-2024-0417',
      authorizationDate: dateOnly(2024, 3, 18),
      responsibleManager: 'Dr. Elif Demir',
      phone: '02165550142',
      fax: '02165550143',
      email: 'info@demo-osgb.com.tr',
      website: 'www.demo-osgb.com.tr',
      addressProvinceId: ctx.provinces.get('İstanbul') ?? null,
      addressDistrictId: ctx.districts.get('İstanbul/Kadıköy') ?? null,
      addressLine: 'Kozyatağı Mah. Değirmen Sok. No:12 Kat:3',
      reportFooter:
        'Bu rapor 6331 sayılı İş Sağlığı ve Güvenliği Kanunu kapsamında düzenlenmiştir. Banka: Demo Bank TR12 0006 4000 0011 2345 6789 01',
      logoKey,
      logoUpdatedAt: logoKey ? daysAgo(90) : null,
    },
    update: { logoKey, logoUpdatedAt: logoKey ? daysAgo(90) : null },
  });
  console.log('✔ organisation profile');
}

// ----------------------------- users & roles ---------------------------------

interface StaffSpec {
  key: keyof DemoContext['users'];
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status?: $Enums.UserStatus;
  lastLoginAt?: Date | null;
}

const STAFF: StaffSpec[] = [
  {
    key: 'physician',
    email: 'hekim@demo.local',
    firstName: 'Elif',
    lastName: 'Demir',
    role: SYSTEM_ROLES.OCCUPATIONAL_PHYSICIAN,
    lastLoginAt: daysAgo(0, 8, 12),
  },
  {
    key: 'radiologist',
    email: 'radyoloji@demo.local',
    firstName: 'Murat',
    lastName: 'Aksoy',
    role: SYSTEM_ROLES.OCCUPATIONAL_PHYSICIAN,
    lastLoginAt: daysAgo(1, 14, 40),
  },
  {
    key: 'nurse',
    email: 'hemsire@demo.local',
    firstName: 'Zeynep',
    lastName: 'Arslan',
    role: SYSTEM_ROLES.NURSE,
    lastLoginAt: daysAgo(0, 8, 2),
  },
  {
    key: 'safety',
    email: 'isg@demo.local',
    firstName: 'Burak',
    lastName: 'Çelik',
    role: SYSTEM_ROLES.SAFETY_SPECIALIST,
    lastLoginAt: daysAgo(2, 10, 15),
  },
  {
    key: 'company',
    email: 'firma@demo.local',
    firstName: 'Selin',
    lastName: 'Yıldız',
    role: SYSTEM_ROLES.COMPANY_REPRESENTATIVE,
    lastLoginAt: daysAgo(6, 16, 5),
  },
  {
    key: 'clerk',
    email: 'kayit@demo.local',
    firstName: 'Merve',
    lastName: 'Aydın',
    role: 'Kayıt Görevlisi',
    lastLoginAt: daysAgo(0, 8, 45),
  },
];

export async function seedStaff(ctx: DemoContext): Promise<void> {
  const { prisma, tenantId } = ctx;
  // Custom (non-system) role to show role management next to the system templates.
  const permissionIds = await prisma.permission.findMany({
    where: {
      key: {
        in: [
          'employees.read',
          'employees.create',
          'employees.update',
          'companies.read',
          'workplaces.read',
          'occupations.read',
          'consents.read',
          'consents.manage',
          'protocols.read',
          'protocols.create',
          'protocols.update',
          'appointments.read',
          'appointments.manage',
          'documents.read',
          'documents.upload',
          'documents.sign',
        ],
      },
    },
    select: { id: true },
  });
  const clerkRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: 'Kayıt Görevlisi' } },
    create: {
      id: uid('role:clerk'),
      tenantId,
      name: 'Kayıt Görevlisi',
      description: 'Hasta kayıt, protokol açma ve belge imza; tıbbi veriye erişemez',
      isSystem: false,
      rolePermissions: { create: permissionIds.map((p) => ({ permissionId: p.id })) },
    },
    update: {},
  });
  void clerkRole;

  for (const spec of STAFF) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { tenantId_name: { tenantId, name: spec.role } },
    });
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: spec.email } },
      create: {
        id: uid(`user:${spec.email}`),
        tenantId,
        email: spec.email,
        passwordHash: ctx.passwordHash,
        firstName: spec.firstName,
        lastName: spec.lastName,
        status: spec.status ?? 'ACTIVE',
        lastLoginAt: spec.lastLoginAt ?? null,
        createdAt: daysAgo(120),
      },
      update: { passwordHash: ctx.passwordHash, lastLoginAt: spec.lastLoginAt ?? null },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { tenantId, userId: user.id, roleId: role.id },
      update: {},
    });
    ctx.users[spec.key] = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  // Extra accounts in non-active states (Personel listesi filters).
  const nurseRole = await prisma.role.findUniqueOrThrow({
    where: { tenantId_name: { tenantId, name: SYSTEM_ROLES.NURSE } },
  });
  for (const [email, first, last, status, created] of [
    ['davetli@demo.local', 'Cem', 'Yalçın', 'INVITED', daysAgo(3)],
    ['pasif@demo.local', 'Gamze', 'Toprak', 'SUSPENDED', daysAgo(200)],
    ['ayrilan@demo.local', 'Onur', 'Sezer', 'DISABLED', daysAgo(400)],
  ] as const) {
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email } },
      create: {
        id: uid(`user:${email}`),
        tenantId,
        email,
        passwordHash: ctx.passwordHash,
        firstName: first,
        lastName: last,
        status,
        createdAt: created,
        lastLoginAt: status === 'INVITED' ? null : daysAgo(150),
      },
      update: {},
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: nurseRole.id } },
      create: { tenantId, userId: user.id, roleId: nurseRole.id },
      update: {},
    });
  }
  await prisma.user.update({
    where: { id: ctx.users.admin.id },
    data: { lastLoginAt: daysAgo(0, 7, 55) },
  });
  console.log(`✔ ${STAFF.length + 3} staff users, 1 custom role`);
}

// ----------------------------- physicians ------------------------------------

export async function seedPhysicians(ctx: DemoContext): Promise<void> {
  const { prisma, tenantId } = ctx;
  const specs = [
    {
      key: 'demir' as const,
      userId: ctx.users.physician.id,
      title: 'Dr.',
      firstName: 'Elif',
      lastName: 'Demir',
      specialty: 'İşyeri Hekimi',
      diplomaNumber: '112233',
      diplomaRegistrationNumber: '34-556677',
      certificateNumber: 'İH-2019-04512',
      phone: gsm('demir'),
      email: 'hekim@demo.local',
      status: 'ACTIVE' as const,
      notes: 'Sorumlu müdür. Pazartesi–Cuma saha ziyaretleri.',
      signature: true,
    },
    {
      key: 'aksoy' as const,
      userId: ctx.users.radiologist.id,
      title: 'Uzm. Dr.',
      firstName: 'Murat',
      lastName: 'Aksoy',
      specialty: 'Radyoloji',
      diplomaNumber: '445566',
      diplomaRegistrationNumber: '06-778899',
      certificateNumber: 'ILO-B-2021-0093',
      phone: gsm('aksoy'),
      email: 'radyoloji@demo.local',
      status: 'ACTIVE' as const,
      notes: 'ILO B okuyucu sertifikası; pnömokonyoz ikinci okuma.',
      signature: true,
    },
    {
      key: 'koc' as const,
      userId: null,
      title: 'Dr.',
      firstName: 'Ayşe',
      lastName: 'Koç',
      specialty: 'İşyeri Hekimi',
      diplomaNumber: '778899',
      diplomaRegistrationNumber: '35-112244',
      certificateNumber: 'İH-2016-01877',
      phone: gsm('koc'),
      email: 'ayse.koc@example.com',
      status: 'INACTIVE' as const,
      notes: 'Sözleşmesi 2025 sonunda bitti; eski raporlar için kayıt tutuluyor.',
      signature: false,
    },
  ];
  for (const spec of specs) {
    const id = uid(`physician:${spec.key}`);
    let signatureKey: string | null = null;
    if (spec.signature && ctx.storage) {
      signatureKey = `${tenantId}/physicians/${id}/signature-${uid(`sig:${spec.key}`)}.png`;
      await ctx.storage.put(
        signatureKey,
        await signaturePng(`${spec.firstName} ${spec.lastName}`),
        'image/png',
      );
    }
    const { key, signature, ...data } = spec;
    void signature;
    await prisma.physician.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        ...data,
        signatureKey,
        signatureUpdatedAt: signatureKey ? daysAgo(80) : null,
        createdAt: daysAgo(118),
      },
      update: { signatureKey, signatureUpdatedAt: signatureKey ? daysAgo(80) : null },
    });
    ctx.physicians[key] = { id, fullName: `${spec.title} ${spec.firstName} ${spec.lastName}` };
  }
  console.log(`✔ ${specs.length} physicians`);
}

// ----------------------------- occupations -----------------------------------

const OCCUPATIONS: Array<[string, string, string?, boolean?]> = [
  ['7212', 'Kaynakçı', 'Ark ve gaz kaynağı; duman, ışın ve gürültü maruziyeti'],
  ['7223', 'CNC Operatörü', 'Metal işleme tezgâhları; gürültü ve kesme sıvısı'],
  ['8344', 'Forklift Operatörü', 'İstif araçları; titreşim ve görme keskinliği gereksinimi'],
  ['7132', 'Boyacı', 'Endüstriyel boya; solvent ve kimyasal maruziyeti'],
  ['7233', 'Makine Bakım Teknisyeni', 'Mekanik bakım; ağır kaldırma ve gürültü'],
  ['9333', 'Depo Görevlisi', 'Yükleme/boşaltma; ergonomik yük'],
  ['7411', 'Elektrikçi', 'Elektrik tesisatı; yüksekte çalışma, renk görme gereksinimi'],
  ['4110', 'Ofis Çalışanı', 'Ekranlı araç kullanımı'],
  ['8332', 'Şoför', 'Ağır vasıta; vardiya, görme ve işitme gereksinimi'],
  ['7522', 'Mobilya İmalatçısı', 'Ahşap tozu ve gürültü'],
  ['9112', 'Temizlik Görevlisi', 'Deterjan ve biyolojik etkenler'],
  ['2512', 'Yazılım Geliştirici', 'Ekranlı araç, uzun süreli oturma'],
  ['2411', 'Muhasebe Uzmanı', 'Ekranlı araç'],
  ['5414', 'Güvenlik Görevlisi', 'Gece vardiyası'],
  ['5120', 'Aşçı', 'Sıcak ortam, kesici alet, portör muayenesi'],
  ['8160', 'Gıda Üretim Operatörü', 'Soğuk/sıcak ortam, hijyen'],
  ['7543', 'Kalite Kontrol Görevlisi', 'Laboratuvar kimyasalları'],
  ['2221', 'Hemşire', 'Kullanılmıyor - pasif tanım', false],
];

export async function seedOccupations(ctx: DemoContext): Promise<void> {
  for (const [code, name, description, isActive] of OCCUPATIONS) {
    const id = uid(`occupation:${code}`);
    await ctx.prisma.occupation.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        code,
        name,
        nameKey: occupationNameKey(name),
        description: description ?? null,
        isActive: isActive ?? true,
        createdAt: daysAgo(115),
      },
      update: {},
    });
    ctx.occupations.set(name, id);
  }
  console.log(`✔ ${OCCUPATIONS.length} occupations`);
}

// ----------------------------- test catalogue --------------------------------

interface TestSpec {
  code: string;
  name: string;
  category: $Enums.TestCategory;
  unitPrice: number;
  vatRate?: number;
  durationMinutes?: number;
  sampleType?: string;
  referenceRange?: string;
  unit?: string;
  isActive?: boolean;
  notes?: string;
}

const TESTS: TestSpec[] = [
  {
    code: 'RAD-PA',
    name: 'Akciğer Grafisi (PA)',
    category: 'RADIOLOGY',
    unitPrice: 350,
    durationMinutes: 10,
  },
  {
    code: 'RAD-LS',
    name: 'Lomber Vertebra Grafisi',
    category: 'RADIOLOGY',
    unitPrice: 400,
    durationMinutes: 15,
  },
  {
    code: 'AUD-PT',
    name: 'Saf Ses Odyometri',
    category: 'AUDIOMETRY',
    unitPrice: 250,
    durationMinutes: 20,
  },
  {
    code: 'ECG-12',
    name: '12 Derivasyon EKG',
    category: 'ECG',
    unitPrice: 200,
    durationMinutes: 10,
  },
  {
    code: 'SFT',
    name: 'Solunum Fonksiyon Testi',
    category: 'SPIROMETRY',
    unitPrice: 250,
    durationMinutes: 15,
  },
  {
    code: 'EYE-VIS',
    name: 'Göz Muayenesi (Görme Keskinliği + Renk)',
    category: 'EYE',
    unitPrice: 150,
    durationMinutes: 10,
  },
  {
    code: 'PNO-ILO',
    name: 'Pnömokonyoz ILO Okuması',
    category: 'PNEUMOCONIOSIS',
    unitPrice: 300,
    durationMinutes: 15,
    notes: 'Mevcut PA grafisi üzerinden A/B okuyucu',
  },
  {
    code: 'LAB-HGB',
    name: 'Hemogram (Tam Kan Sayımı)',
    category: 'LAB',
    unitPrice: 120,
    vatRate: 10,
    sampleType: 'Kan (EDTA)',
    referenceRange: 'Hb 12–17',
    unit: 'g/dL',
  },
  {
    code: 'LAB-GLU',
    name: 'Açlık Kan Şekeri',
    category: 'LAB',
    unitPrice: 60,
    vatRate: 10,
    sampleType: 'Kan (serum)',
    referenceRange: '70–100',
    unit: 'mg/dL',
  },
  {
    code: 'LAB-CHOL',
    name: 'Total Kolesterol',
    category: 'LAB',
    unitPrice: 70,
    vatRate: 10,
    sampleType: 'Kan (serum)',
    referenceRange: '< 200',
    unit: 'mg/dL',
  },
  {
    code: 'LAB-ALT',
    name: 'ALT (SGPT)',
    category: 'LAB',
    unitPrice: 60,
    vatRate: 10,
    sampleType: 'Kan (serum)',
    referenceRange: '0–41',
    unit: 'U/L',
  },
  {
    code: 'LAB-AST',
    name: 'AST (SGOT)',
    category: 'LAB',
    unitPrice: 60,
    vatRate: 10,
    sampleType: 'Kan (serum)',
    referenceRange: '0–40',
    unit: 'U/L',
  },
  {
    code: 'LAB-TIT',
    name: 'Tam İdrar Tahlili',
    category: 'LAB',
    unitPrice: 50,
    vatRate: 10,
    sampleType: 'İdrar',
  },
  {
    code: 'LAB-HBSAG',
    name: 'HBsAg',
    category: 'LAB',
    unitPrice: 110,
    vatRate: 10,
    sampleType: 'Kan (serum)',
    referenceRange: 'Negatif',
  },
  {
    code: 'LAB-PB',
    name: 'Kan Kurşun Düzeyi',
    category: 'LAB',
    unitPrice: 320,
    vatRate: 10,
    sampleType: 'Kan (heparin)',
    referenceRange: '< 10',
    unit: 'µg/dL',
  },
  {
    code: 'LAB-PORTOR',
    name: 'Portör Muayenesi (Gaita kültürü + parazit + boğaz)',
    category: 'LAB',
    unitPrice: 280,
    vatRate: 10,
    sampleType: 'Gaita / boğaz sürüntüsü',
  },
  {
    code: 'HR-EK2',
    name: 'İşe Giriş / Periyodik Muayene Raporu (Ek-2)',
    category: 'HEALTH_REPORT',
    unitPrice: 450,
    durationMinutes: 30,
  },
  {
    code: 'HR-AGIR',
    name: 'Ağır ve Tehlikeli İşler Raporu',
    category: 'HEALTH_REPORT',
    unitPrice: 550,
    durationMinutes: 30,
  },
  {
    code: 'ISG-RISK',
    name: 'Risk Değerlendirme Raporu',
    category: 'ISG_REPORT',
    unitPrice: 4500,
    durationMinutes: 480,
  },
  {
    code: 'ISG-ACIL',
    name: 'Acil Durum Eylem Planı',
    category: 'ISG_REPORT',
    unitPrice: 2500,
    durationMinutes: 240,
  },
  {
    code: 'OTH-TET',
    name: 'Tetanoz Aşısı',
    category: 'OTHER',
    unitPrice: 90,
    vatRate: 10,
    sampleType: 'İM enjeksiyon',
  },
  { code: 'OTH-EGT', name: 'Temel İSG Eğitimi (kişi başı)', category: 'OTHER', unitPrice: 180 },
  {
    code: 'RAD-CT',
    name: 'Toraks BT (dış merkez)',
    category: 'RADIOLOGY',
    unitPrice: 1800,
    isActive: false,
    notes: 'Anlaşmalı merkez sözleşmesi bitti',
  },
];

interface PackageSpec {
  code: string;
  name: string;
  description: string;
  price: number | null;
  items: string[];
  isActive?: boolean;
}

const PACKAGES: PackageSpec[] = [
  {
    code: 'PKG-GIRIS',
    name: 'İşe Giriş Standart',
    description: 'Tehlikeli sınıf işyerleri için işe giriş seti',
    price: 1450,
    items: ['RAD-PA', 'AUD-PT', 'ECG-12', 'SFT', 'EYE-VIS', 'LAB-HGB', 'LAB-GLU', 'HR-EK2'],
  },
  {
    code: 'PKG-GURULTU',
    name: 'Periyodik - Gürültülü Ortam',
    description: 'Gürültü maruziyeti olan çalışanlar için yıllık kontrol',
    price: null,
    items: ['AUD-PT', 'EYE-VIS', 'HR-EK2'],
  },
  {
    code: 'PKG-TOZ',
    name: 'Periyodik - Tozlu Ortam',
    description: 'Silika / metal tozu maruziyeti; ILO okuması dâhil',
    price: 1300,
    items: ['RAD-PA', 'SFT', 'PNO-ILO', 'HR-EK2'],
  },
  {
    code: 'PKG-OFIS',
    name: 'Ofis Çalışanı',
    description: 'Ekranlı araç kullananlar için göz + rapor',
    price: 550,
    items: ['EYE-VIS', 'HR-EK2'],
  },
  {
    code: 'PKG-AGIR',
    name: 'Ağır ve Tehlikeli İşler',
    description: 'Çok tehlikeli sınıf tam set',
    price: 2400,
    items: [
      'RAD-PA',
      'AUD-PT',
      'ECG-12',
      'SFT',
      'EYE-VIS',
      'LAB-HGB',
      'LAB-GLU',
      'LAB-ALT',
      'LAB-AST',
      'LAB-TIT',
      'HR-AGIR',
    ],
  },
  {
    code: 'PKG-GIDA',
    name: 'Gıda Sektörü (Portör)',
    description: 'Gıda ile temas eden personel',
    price: 900,
    items: ['LAB-PORTOR', 'LAB-HBSAG', 'RAD-PA', 'HR-EK2'],
  },
  {
    code: 'PKG-ESKI',
    name: 'Eski Periyodik Paket (2024)',
    description: 'Fiyat listesi güncellendi; kullanılmıyor',
    price: 800,
    items: ['AUD-PT', 'HR-EK2'],
    isActive: false,
  },
];

export async function seedTests(ctx: DemoContext): Promise<void> {
  const { prisma, tenantId } = ctx;
  for (const [index, spec] of TESTS.entries()) {
    const id = uid(`test:${spec.code}`);
    await prisma.testDefinition.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        code: spec.code,
        name: spec.name,
        category: spec.category,
        unitPrice: spec.unitPrice,
        vatRate: spec.vatRate ?? 20,
        durationMinutes: spec.durationMinutes ?? null,
        sampleType: spec.sampleType ?? null,
        referenceRange: spec.referenceRange ?? null,
        unit: spec.unit ?? null,
        isActive: spec.isActive ?? true,
        sortOrder: index,
        notes: spec.notes ?? null,
        createdAt: daysAgo(110),
      },
      update: {},
    });
    ctx.tests.set(spec.code, id);
  }
  for (const [index, spec] of PACKAGES.entries()) {
    const id = uid(`package:${spec.code}`);
    await prisma.testPackage.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        code: spec.code,
        name: spec.name,
        description: spec.description,
        price: spec.price,
        isActive: spec.isActive ?? true,
        sortOrder: index,
        createdAt: daysAgo(105),
        items: {
          create: spec.items.map((code, orderIndex) => ({
            testId: ctx.tests.get(code)!,
            orderIndex,
          })),
        },
      },
      update: {},
    });
  }
  console.log(`✔ ${TESTS.length} test definitions, ${PACKAGES.length} packages`);
}

// ----------------------------- companies -------------------------------------

export interface CompanySpec {
  key: string;
  name: string;
  hazardClass: $Enums.HazardClass;
  taxNumber: string;
  sgk: string;
  address: string;
  phone: string;
  email: string;
  branches: Array<{ key: string; name: string; address: string; phone: string }>;
  workplaces: Array<{
    key: string;
    name: string;
    branch?: string;
    sgk: string;
    hazardClass: $Enums.HazardClass;
    naceCode: string;
    address: string;
    employeeCount: number;
  }>;
}

export const COMPANIES: CompanySpec[] = [
  {
    key: 'demir',
    name: 'Demir Çelik Sanayi A.Ş.',
    hazardClass: 'VERY_HAZARDOUS',
    taxNumber: '2750014836',
    sgk: '2 2410 01 01 1052874 041 21 63',
    address: 'Gebze Organize Sanayi Bölgesi, 1000. Cad. No:14, Gebze / Kocaeli',
    phone: landline('demir', '262'),
    email: 'ik@demircelik.com.tr',
    branches: [
      {
        key: 'demir-gebze',
        name: 'Gebze Fabrika',
        address: 'GOSB 1000. Cad. No:14, Gebze',
        phone: landline('demir-gebze', '262'),
      },
      {
        key: 'demir-dilovasi',
        name: 'Dilovası Depo',
        address: 'Dilovası OSB 3. Kısım No:8, Dilovası',
        phone: landline('demir-dilovasi', '262'),
      },
    ],
    workplaces: [
      {
        key: 'demir-uretim',
        name: 'Gebze Üretim Tesisi',
        branch: 'demir-gebze',
        sgk: '2 2410 01 01 1052874 041 21 63',
        hazardClass: 'VERY_HAZARDOUS',
        naceCode: '24.10.01',
        address: 'GOSB 1000. Cad. No:14',
        employeeCount: 180,
      },
      {
        key: 'demir-depo',
        name: 'Dilovası Lojistik Deposu',
        branch: 'demir-dilovasi',
        sgk: '2 5210 01 01 1052874 041 21 64',
        hazardClass: 'HAZARDOUS',
        naceCode: '52.10.01',
        address: 'Dilovası OSB 3. Kısım No:8',
        employeeCount: 35,
      },
    ],
  },
  {
    key: 'mobilya',
    name: 'Anadolu Mobilya San. ve Tic. Ltd. Şti.',
    hazardClass: 'HAZARDOUS',
    taxNumber: '0680392517',
    sgk: '2 3101 01 01 0984512 038 11 07',
    address: 'Kayseri OSB 12. Cad. No:5, Melikgazi / Kayseri',
    phone: landline('mobilya', '352'),
    email: 'info@anadolumobilya.com',
    branches: [
      {
        key: 'mobilya-merkez',
        name: 'Merkez Atölye',
        address: 'Kayseri OSB 12. Cad. No:5',
        phone: landline('mobilya-merkez', '352'),
      },
    ],
    workplaces: [
      {
        key: 'mobilya-atolye',
        name: 'Kayseri OSB Atölye',
        branch: 'mobilya-merkez',
        sgk: '2 3101 01 01 0984512 038 11 07',
        hazardClass: 'HAZARDOUS',
        naceCode: '31.01.01',
        address: 'Kayseri OSB 12. Cad. No:5',
        employeeCount: 62,
      },
    ],
  },
  {
    key: 'yazilim',
    name: 'Yıldız Yazılım ve Danışmanlık A.Ş.',
    hazardClass: 'LESS_HAZARDOUS',
    taxNumber: '9540127384',
    sgk: '2 6201 01 01 1187345 034 12 90',
    address: 'Maslak Mah. Büyükdere Cad. No:255 Kat:12, Sarıyer / İstanbul',
    phone: landline('yazilim', '212'),
    email: 'people@yildizyazilim.com',
    branches: [],
    workplaces: [
      {
        key: 'yazilim-ofis',
        name: 'Maslak Ofis',
        sgk: '2 6201 01 01 1187345 034 12 90',
        hazardClass: 'LESS_HAZARDOUS',
        naceCode: '62.01.01',
        address: 'Büyükdere Cad. No:255 Kat:12',
        employeeCount: 48,
      },
    ],
  },
  {
    key: 'lojistik',
    name: 'Marmara Lojistik ve Nakliyat Ltd. Şti.',
    hazardClass: 'HAZARDOUS',
    taxNumber: '6127459038',
    sgk: '2 4941 01 01 0765432 034 09 44',
    address: 'Hadımköy Sanayi Bölgesi Ömerli Mah. No:22, Arnavutköy / İstanbul',
    phone: landline('lojistik', '212'),
    email: 'ik@marmaralojistik.com.tr',
    branches: [
      {
        key: 'lojistik-hadimkoy',
        name: 'Hadımköy Merkez',
        address: 'Ömerli Mah. No:22',
        phone: landline('lojistik-hadimkoy', '212'),
      },
    ],
    workplaces: [
      {
        key: 'lojistik-depo',
        name: 'Hadımköy Depo ve Filo',
        branch: 'lojistik-hadimkoy',
        sgk: '2 4941 01 01 0765432 034 09 44',
        hazardClass: 'HAZARDOUS',
        naceCode: '49.41.01',
        address: 'Ömerli Mah. No:22',
        employeeCount: 90,
      },
    ],
  },
  {
    key: 'gida',
    name: 'Ege Gıda Üretim A.Ş.',
    hazardClass: 'HAZARDOUS',
    taxNumber: '3280561749',
    sgk: '2 1085 01 01 1342876 035 14 21',
    address: 'Torbalı OSB 7. Sok. No:3, Torbalı / İzmir',
    phone: landline('gida', '232'),
    email: 'kalite@egegida.com.tr',
    branches: [],
    workplaces: [
      {
        key: 'gida-tesis',
        name: 'Torbalı Üretim Tesisi',
        sgk: '2 1085 01 01 1342876 035 14 21',
        hazardClass: 'HAZARDOUS',
        naceCode: '10.85.01',
        address: 'Torbalı OSB 7. Sok. No:3',
        employeeCount: 120,
      },
    ],
  },
];

export const companyId = (key: string) => uid(`company:${key}`);
export const branchId = (key: string) => uid(`branch:${key}`);
export const workplaceId = (key: string) => uid(`workplace:${key}`);

export async function seedCompanies(ctx: DemoContext): Promise<void> {
  const { prisma, tenantId } = ctx;
  for (const spec of COMPANIES) {
    await prisma.company.upsert({
      where: { id: companyId(spec.key) },
      create: {
        id: companyId(spec.key),
        tenantId,
        name: spec.name,
        taxNumber: spec.taxNumber,
        sgkRegistrationNumber: spec.sgk,
        hazardClass: spec.hazardClass,
        address: spec.address,
        phone: spec.phone,
        email: spec.email,
        createdAt: daysAgo(100),
      },
      update: {},
    });
    for (const branch of spec.branches) {
      await prisma.branch.upsert({
        where: { id: branchId(branch.key) },
        create: {
          id: branchId(branch.key),
          tenantId,
          companyId: companyId(spec.key),
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
          createdAt: daysAgo(99),
        },
        update: {},
      });
    }
    for (const wp of spec.workplaces) {
      await prisma.workplace.upsert({
        where: { id: workplaceId(wp.key) },
        create: {
          id: workplaceId(wp.key),
          tenantId,
          companyId: companyId(spec.key),
          branchId: wp.branch ? branchId(wp.branch) : null,
          name: wp.name,
          sgkRegistrationNumber: wp.sgk,
          hazardClass: wp.hazardClass,
          naceCode: wp.naceCode,
          address: wp.address,
          employeeCount: wp.employeeCount,
          createdAt: daysAgo(98),
        },
        update: {},
      });
    }
  }
  // A soft-deleted company: proves list/detail filters hide `deletedAt` rows.
  await prisma.company.upsert({
    where: { id: companyId('kapanan') },
    create: {
      id: companyId('kapanan'),
      tenantId,
      name: 'Kapanan Tekstil Ltd. Şti.',
      hazardClass: 'HAZARDOUS',
      taxNumber: '1111111111',
      createdAt: daysAgo(300),
      deletedAt: daysAgo(40),
    },
    update: {},
  });
  console.log(`✔ ${COMPANIES.length} companies (+1 soft-deleted)`);
}

// ----------------------------- employees -------------------------------------

export interface EmployeeSpec {
  key: string;
  first: string;
  last: string;
  gender: $Enums.Gender;
  birth: [number, number, number];
  company?: string;
  workplace?: string;
  branch?: string;
  occupation?: string;
  jobTitle?: string;
  department?: string;
  hire?: [number, number, number];
  status?: $Enums.EmployeeStatus;
  identity?: $Enums.IdentityVerificationStatus;
  passport?: string;
  province: string;
  district: string;
  addressLine: string;
  notes?: string;
  photo?: boolean;
  mother: string;
  father: string;
  heightCm: number;
  weightKg: number;
}

export const EMPLOYEES: EmployeeSpec[] = [
  {
    key: 'mehmet-kaya',
    first: 'Mehmet',
    last: 'Kaya',
    gender: 'MALE',
    birth: [1985, 4, 12],
    company: 'demir',
    workplace: 'demir-uretim',
    branch: 'demir-gebze',
    occupation: 'Kaynakçı',
    department: 'Üretim - Kaynak',
    hire: [2016, 3, 1],
    identity: 'VERIFIED',
    province: 'Kocaeli',
    district: 'Gebze',
    addressLine: 'Mustafapaşa Mah. 1234. Sok. No:7 D:3',
    photo: true,
    notes: 'Silika ve kaynak dumanı maruziyeti; yıllık PA + SFT + odyometri takibi.',
    mother: 'Hatice',
    father: 'Ali',
    heightCm: 178,
    weightKg: 84,
  },
  {
    key: 'ayse-yilmaz',
    first: 'Ayşe',
    last: 'Yılmaz',
    gender: 'FEMALE',
    birth: [1990, 9, 3],
    company: 'demir',
    workplace: 'demir-uretim',
    branch: 'demir-gebze',
    occupation: 'CNC Operatörü',
    department: 'Üretim - Talaşlı İmalat',
    hire: [2024, 6, 17],
    identity: 'VERIFIED',
    province: 'Kocaeli',
    district: 'Gebze',
    addressLine: 'Osmanyılmaz Mah. Şehit Cad. No:41',
    photo: true,
    mother: 'Fatma',
    father: 'Mehmet',
    heightCm: 164,
    weightKg: 58,
  },
  {
    key: 'hasan-demir',
    first: 'Hasan',
    last: 'Demir',
    gender: 'MALE',
    birth: [1978, 1, 22],
    company: 'demir',
    workplace: 'demir-uretim',
    branch: 'demir-gebze',
    occupation: 'Forklift Operatörü',
    department: 'Lojistik',
    hire: [2012, 11, 5],
    identity: 'MANUAL',
    province: 'Kocaeli',
    district: 'Darıca',
    addressLine: 'Bayramoğlu Mah. Sahil Cad. No:112',
    photo: true,
    notes: 'Hipertansiyon tanısı (2023); ilaç: amlodipin 5 mg.',
    mother: 'Zeliha',
    father: 'Hüseyin',
    heightCm: 172,
    weightKg: 96,
  },
  {
    key: 'fatma-sahin',
    first: 'Fatma',
    last: 'Şahin',
    gender: 'FEMALE',
    birth: [1988, 7, 30],
    company: 'demir',
    workplace: 'demir-uretim',
    branch: 'demir-gebze',
    occupation: 'Boyacı',
    department: 'Üretim - Boyahane',
    hire: [2019, 2, 11],
    identity: 'VERIFIED',
    province: 'Kocaeli',
    district: 'Gebze',
    addressLine: 'Cumhuriyet Mah. 456. Sok. No:3',
    photo: false,
    notes: 'Sigara: 15 paket-yıl. Solvent maruziyeti.',
    mother: 'Ayşe',
    father: 'İsmail',
    heightCm: 160,
    weightKg: 62,
  },
  {
    key: 'ali-ozturk',
    first: 'Ali',
    last: 'Öztürk',
    gender: 'MALE',
    birth: [1982, 11, 8],
    company: 'demir',
    workplace: 'demir-uretim',
    branch: 'demir-gebze',
    occupation: 'Makine Bakım Teknisyeni',
    department: 'Bakım',
    hire: [2015, 8, 24],
    identity: 'VERIFIED',
    province: 'İstanbul',
    district: 'Pendik',
    addressLine: 'Kurtköy Mah. Ankara Cad. No:210 D:9',
    photo: true,
    mother: 'Emine',
    father: 'Kadir',
    heightCm: 175,
    weightKg: 79,
  },
  {
    key: 'emine-celik',
    first: 'Emine',
    last: 'Çelik',
    gender: 'FEMALE',
    birth: [1995, 5, 19],
    company: 'demir',
    workplace: 'demir-depo',
    branch: 'demir-dilovasi',
    occupation: 'Depo Görevlisi',
    department: 'Depo',
    hire: [2026, 9, 8],
    identity: 'UNVERIFIED',
    province: 'Kocaeli',
    district: 'Dilovası',
    addressLine: 'Diliskelesi Mah. 3. Sok. No:18',
    photo: false,
    notes: 'Yeni işe giriş; kimlik doğrulama bekleniyor.',
    mother: 'Hanife',
    father: 'Ramazan',
    heightCm: 167,
    weightKg: 61,
  },
  {
    key: 'mustafa-arslan',
    first: 'Mustafa',
    last: 'Arslan',
    gender: 'MALE',
    birth: [1975, 3, 2],
    company: 'demir',
    workplace: 'demir-uretim',
    branch: 'demir-gebze',
    occupation: 'Elektrikçi',
    department: 'Bakım - Elektrik',
    hire: [2008, 4, 14],
    identity: 'VERIFIED',
    province: 'Kocaeli',
    district: 'Çayırova',
    addressLine: 'Akse Mah. Fatih Cad. No:66',
    photo: true,
    mother: 'Gülsüm',
    father: 'Osman',
    heightCm: 170,
    weightKg: 77,
  },
  {
    key: 'huseyin-dogan',
    first: 'Hüseyin',
    last: 'Doğan',
    gender: 'MALE',
    birth: [1970, 8, 15],
    company: 'demir',
    workplace: 'demir-uretim',
    branch: 'demir-gebze',
    occupation: 'Kaynakçı',
    department: 'Üretim - Kaynak',
    hire: [2005, 1, 10],
    status: 'ON_LEAVE',
    identity: 'VERIFIED',
    province: 'Kocaeli',
    district: 'Gebze',
    addressLine: 'İstasyon Mah. Demiryolu Cad. No:9',
    photo: true,
    notes: 'KOAH tanısı; işe dönüş muayenesi sonrası kaynak işi uygun görülmedi.',
    mother: 'Sultan',
    father: 'Bekir',
    heightCm: 168,
    weightKg: 64,
  },
  {
    key: 'zeynep-kurt',
    first: 'Zeynep',
    last: 'Kurt',
    gender: 'FEMALE',
    birth: [1993, 12, 27],
    company: 'demir',
    workplace: 'demir-uretim',
    branch: 'demir-gebze',
    occupation: 'Ofis Çalışanı',
    department: 'İnsan Kaynakları',
    hire: [2021, 10, 4],
    identity: 'VERIFIED',
    province: 'İstanbul',
    district: 'Tuzla',
    addressLine: 'Aydınlı Mah. Deniz Sok. No:4',
    photo: false,
    mother: 'Nuran',
    father: 'Selim',
    heightCm: 168,
    weightKg: 57,
  },
  {
    key: 'ibrahim-aydin',
    first: 'İbrahim',
    last: 'Aydın',
    gender: 'MALE',
    birth: [1980, 6, 6],
    company: 'demir',
    workplace: 'demir-depo',
    branch: 'demir-dilovasi',
    occupation: 'Şoför',
    department: 'Lojistik',
    hire: [2017, 5, 2],
    status: 'TERMINATED',
    identity: 'VERIFIED',
    province: 'Kocaeli',
    district: 'Dilovası',
    addressLine: 'Orhangazi Mah. 12. Sok. No:2',
    photo: false,
    notes: 'İşten ayrılış muayenesi yapıldı (2025).',
    mother: 'Kezban',
    father: 'Yaşar',
    heightCm: 176,
    weightKg: 88,
  },
  {
    key: 'ahmet-polat',
    first: 'Ahmet',
    last: 'Polat',
    gender: 'MALE',
    birth: [1992, 2, 14],
    company: 'demir',
    workplace: 'demir-uretim',
    branch: 'demir-gebze',
    occupation: 'Kaynakçı',
    department: 'Üretim - Kaynak',
    hire: [2026, 9, 10],
    identity: 'FAILED',
    province: 'Kocaeli',
    district: 'Gebze',
    addressLine: 'Hacıhalil Mah. 1601. Sok. No:5',
    photo: false,
    notes: 'NVİ sorgusu ad/soyad uyuşmazlığı verdi; kimlik aslı ile tekrar kontrol edilecek.',
    mother: 'Meryem',
    father: 'Şükrü',
    heightCm: 181,
    weightKg: 80,
  },
  {
    key: 'elif-koc',
    first: 'Elif',
    last: 'Koç',
    gender: 'FEMALE',
    birth: [1991, 10, 11],
    company: 'mobilya',
    workplace: 'mobilya-atolye',
    branch: 'mobilya-merkez',
    occupation: 'Boyacı',
    department: 'Vernik',
    hire: [2026, 8, 31],
    identity: 'VERIFIED',
    province: 'Kayseri',
    district: 'Melikgazi',
    addressLine: 'Hunat Mah. Talas Cad. No:35 D:6',
    photo: true,
    mother: 'Şerife',
    father: 'Halil',
    heightCm: 165,
    weightKg: 60,
  },
  {
    key: 'osman-yildirim',
    first: 'Osman',
    last: 'Yıldırım',
    gender: 'MALE',
    birth: [1983, 4, 25],
    company: 'mobilya',
    workplace: 'mobilya-atolye',
    branch: 'mobilya-merkez',
    occupation: 'Mobilya İmalatçısı',
    department: 'Ahşap İşleme',
    hire: [2025, 1, 6],
    identity: 'VERIFIED',
    province: 'Kayseri',
    district: 'Kocasinan',
    addressLine: 'Erkilet Mah. Fevzi Çakmak Cad. No:88',
    photo: true,
    notes: 'Ahşap tozu; SFT kısıtlayıcı patern - takip.',
    mother: 'Döndü',
    father: 'Mustafa',
    heightCm: 174,
    weightKg: 92,
  },
  {
    key: 'merve-aksoy',
    first: 'Merve',
    last: 'Aksoy',
    gender: 'FEMALE',
    birth: [1997, 1, 9],
    company: 'mobilya',
    workplace: 'mobilya-atolye',
    branch: 'mobilya-merkez',
    occupation: 'Ofis Çalışanı',
    department: 'Satış',
    hire: [2022, 3, 21],
    identity: 'VERIFIED',
    province: 'Kayseri',
    district: 'Melikgazi',
    addressLine: 'Alpaslan Mah. 45. Sok. No:12',
    photo: false,
    mother: 'Sevim',
    father: 'Erol',
    heightCm: 162,
    weightKg: 55,
  },
  {
    key: 'yusuf-kilic',
    first: 'Yusuf',
    last: 'Kılıç',
    gender: 'MALE',
    birth: [1989, 8, 2],
    company: 'mobilya',
    workplace: 'mobilya-atolye',
    branch: 'mobilya-merkez',
    occupation: 'Forklift Operatörü',
    department: 'Sevkiyat',
    hire: [2020, 7, 13],
    identity: 'MANUAL',
    province: 'Kayseri',
    district: 'Talas',
    addressLine: 'Mevlana Mah. 9. Cad. No:23',
    photo: true,
    mother: 'Havva',
    father: 'Cemal',
    heightCm: 179,
    weightKg: 83,
  },
  {
    key: 'hatice-oz',
    first: 'Hatice',
    last: 'Öz',
    gender: 'FEMALE',
    birth: [1972, 5, 5],
    company: 'mobilya',
    workplace: 'mobilya-atolye',
    branch: 'mobilya-merkez',
    occupation: 'Temizlik Görevlisi',
    department: 'İdari İşler',
    hire: [2018, 9, 3],
    identity: 'VERIFIED',
    province: 'Kayseri',
    district: 'Melikgazi',
    addressLine: 'Gültepe Mah. 14. Sok. No:6',
    photo: false,
    mother: 'Ümmühan',
    father: 'Rıza',
    heightCm: 158,
    weightKg: 71,
  },
  {
    key: 'burak-erdogan',
    first: 'Burak',
    last: 'Erdoğan',
    gender: 'MALE',
    birth: [1994, 11, 30],
    company: 'mobilya',
    workplace: 'mobilya-atolye',
    branch: 'mobilya-merkez',
    occupation: 'CNC Operatörü',
    department: 'Ahşap İşleme',
    hire: [2023, 5, 15],
    identity: 'VERIFIED',
    province: 'Kayseri',
    district: 'Kocasinan',
    addressLine: 'Yenişehir Mah. 22. Sok. No:31',
    photo: false,
    mother: 'Nazlı',
    father: 'Fikret',
    heightCm: 177,
    weightKg: 74,
  },
  {
    key: 'selin-yildiz',
    first: 'Selin',
    last: 'Yıldız',
    gender: 'FEMALE',
    birth: [1995, 3, 17],
    company: 'yazilim',
    workplace: 'yazilim-ofis',
    occupation: 'Yazılım Geliştirici',
    department: 'Ürün Geliştirme',
    hire: [2021, 2, 1],
    identity: 'VERIFIED',
    province: 'İstanbul',
    district: 'Kadıköy',
    addressLine: 'Caferağa Mah. Moda Cad. No:71 D:4',
    photo: true,
    mother: 'Aylin',
    father: 'Tuncay',
    heightCm: 169,
    weightKg: 59,
  },
  {
    key: 'can-aksoy',
    first: 'Can',
    last: 'Aksoy',
    gender: 'MALE',
    birth: [1998, 6, 21],
    company: 'yazilim',
    workplace: 'yazilim-ofis',
    occupation: 'Yazılım Geliştirici',
    department: 'Ürün Geliştirme',
    hire: [2023, 9, 4],
    identity: 'VERIFIED',
    province: 'İstanbul',
    district: 'Beşiktaş',
    addressLine: 'Levent Mah. Çalıkuşu Sok. No:8',
    photo: false,
    mother: 'Sibel',
    father: 'Levent',
    heightCm: 183,
    weightKg: 76,
  },
  {
    key: 'deniz-kara',
    first: 'Deniz',
    last: 'Kara',
    gender: 'FEMALE',
    birth: [1986, 9, 9],
    company: 'yazilim',
    workplace: 'yazilim-ofis',
    occupation: 'Muhasebe Uzmanı',
    department: 'Finans',
    hire: [2019, 6, 10],
    identity: 'VERIFIED',
    province: 'İstanbul',
    district: 'Şişli',
    addressLine: 'Mecidiyeköy Mah. Ortaklar Cad. No:19 D:12',
    photo: true,
    mother: 'Leyla',
    father: 'Necati',
    heightCm: 166,
    weightKg: 63,
  },
  {
    key: 'kerem-uslu',
    first: 'Kerem',
    last: 'Uslu',
    gender: 'MALE',
    birth: [1979, 12, 1],
    company: 'yazilim',
    workplace: 'yazilim-ofis',
    occupation: 'Güvenlik Görevlisi',
    department: 'İdari İşler',
    hire: [2020, 1, 20],
    identity: 'MANUAL',
    province: 'İstanbul',
    district: 'Sarıyer',
    addressLine: 'Ayazağa Mah. Cendere Cad. No:3',
    photo: false,
    notes: 'Gece vardiyası (22:00–06:00).',
    mother: 'Melek',
    father: 'Sabri',
    heightCm: 180,
    weightKg: 91,
  },
  {
    key: 'ramazan-gunes',
    first: 'Ramazan',
    last: 'Güneş',
    gender: 'MALE',
    birth: [1976, 7, 7],
    company: 'lojistik',
    workplace: 'lojistik-depo',
    branch: 'lojistik-hadimkoy',
    occupation: 'Şoför',
    department: 'Filo',
    hire: [2014, 3, 3],
    identity: 'VERIFIED',
    province: 'İstanbul',
    district: 'Arnavutköy',
    addressLine: 'Hadımköy Mah. Ömerli Cad. No:44',
    photo: true,
    notes: 'Amatör maraton koşucusu; istirahat bradikardisi bilinen.',
    mother: 'Hacer',
    father: 'Veli',
    heightCm: 174,
    weightKg: 70,
  },
  {
    key: 'serkan-bulut',
    first: 'Serkan',
    last: 'Bulut',
    gender: 'MALE',
    birth: [1990, 4, 18],
    company: 'lojistik',
    workplace: 'lojistik-depo',
    branch: 'lojistik-hadimkoy',
    occupation: 'Depo Görevlisi',
    department: 'Depo',
    hire: [2022, 8, 8],
    identity: 'VERIFIED',
    province: 'İstanbul',
    district: 'Başakşehir',
    addressLine: 'Kayabaşı Mah. 3. Etap No:12 D:21',
    photo: false,
    mother: 'Songül',
    father: 'Ergün',
    heightCm: 176,
    weightKg: 82,
  },
  {
    key: 'gul-aslan',
    first: 'Gül',
    last: 'Aslan',
    gender: 'FEMALE',
    birth: [1989, 2, 2],
    company: 'lojistik',
    workplace: 'lojistik-depo',
    branch: 'lojistik-hadimkoy',
    occupation: 'Ofis Çalışanı',
    department: 'Operasyon',
    hire: [2018, 11, 19],
    identity: 'VERIFIED',
    province: 'İstanbul',
    district: 'Esenyurt',
    addressLine: 'Saadetdere Mah. 27. Sok. No:9',
    photo: false,
    mother: 'Nermin',
    father: 'Turan',
    heightCm: 163,
    weightKg: 66,
  },
  {
    key: 'volkan-tas',
    first: 'Volkan',
    last: 'Taş',
    gender: 'MALE',
    birth: [1985, 10, 23],
    company: 'lojistik',
    workplace: 'lojistik-depo',
    branch: 'lojistik-hadimkoy',
    occupation: 'Forklift Operatörü',
    department: 'Depo',
    hire: [2016, 6, 6],
    identity: 'VERIFIED',
    province: 'İstanbul',
    district: 'Arnavutköy',
    addressLine: 'Taşoluk Mah. Hürriyet Cad. No:15',
    photo: true,
    mother: 'Fadime',
    father: 'Zeki',
    heightCm: 171,
    weightKg: 85,
  },
  {
    key: 'nur-simsek',
    first: 'Nur',
    last: 'Şimşek',
    gender: 'FEMALE',
    birth: [1984, 1, 28],
    company: 'gida',
    workplace: 'gida-tesis',
    occupation: 'Aşçı',
    department: 'Üretim Mutfağı',
    hire: [2013, 4, 22],
    identity: 'VERIFIED',
    province: 'İzmir',
    district: 'Torbalı',
    addressLine: 'Ayrancılar Mah. 5. Sok. No:27',
    photo: true,
    mother: 'Perihan',
    father: 'Adem',
    heightCm: 161,
    weightKg: 68,
  },
  {
    key: 'emre-sari',
    first: 'Emre',
    last: 'Sarı',
    gender: 'MALE',
    birth: [1996, 8, 12],
    company: 'gida',
    workplace: 'gida-tesis',
    occupation: 'Gıda Üretim Operatörü',
    department: 'Paketleme',
    hire: [2024, 2, 26],
    identity: 'VERIFIED',
    province: 'İzmir',
    district: 'Menderes',
    addressLine: 'Görece Mah. Atatürk Cad. No:5',
    photo: false,
    mother: 'Gönül',
    father: 'Metin',
    heightCm: 178,
    weightKg: 72,
  },
  {
    key: 'ahmed-alhassan',
    first: 'Ahmed',
    last: 'Al-Hassan',
    gender: 'MALE',
    birth: [1993, 3, 3],
    company: 'gida',
    workplace: 'gida-tesis',
    occupation: 'Temizlik Görevlisi',
    department: 'Hijyen',
    hire: [2025, 10, 1],
    identity: 'MANUAL',
    passport: 'N01234567',
    province: 'İzmir',
    district: 'Torbalı',
    addressLine: 'Tepeköy Mah. 8. Sok. No:11',
    photo: true,
    notes: 'Yabancı uyruklu (Suriye); çalışma izni no 2025-ÇİZ-77812. Pasaport ile kayıt.',
    mother: 'Amina',
    father: 'Khalid',
    heightCm: 173,
    weightKg: 69,
  },
  {
    key: 'sevgi-tekin',
    first: 'Sevgi',
    last: 'Tekin',
    gender: 'FEMALE',
    birth: [1990, 5, 14],
    company: 'gida',
    workplace: 'gida-tesis',
    occupation: 'Kalite Kontrol Görevlisi',
    department: 'Kalite',
    hire: [2020, 9, 14],
    identity: 'VERIFIED',
    province: 'İzmir',
    district: 'Bornova',
    addressLine: 'Kazımdirik Mah. 372. Sok. No:4 D:7',
    photo: false,
    mother: 'Nurten',
    father: 'İlhan',
    heightCm: 167,
    weightKg: 58,
  },
  {
    key: 'mahmut-kilinc',
    first: 'Mahmut',
    last: 'Kılınç',
    gender: 'MALE',
    birth: [1987, 7, 19],
    jobTitle: 'Serbest Çalışan (bireysel başvuru)',
    identity: 'MANUAL',
    province: 'İstanbul',
    district: 'Kadıköy',
    addressLine: 'Fikirtepe Mah. Mandıra Cad. No:60',
    photo: false,
    notes: 'İşyeri bağlantısı yok; ehliyet için sağlık raporu başvurusu.',
    mother: 'Cemile',
    father: 'Abdullah',
    heightCm: 175,
    weightKg: 80,
  },
];

export const employeeId = (key: string) => uid(`employee:${key}`);

export async function seedEmployees(ctx: DemoContext): Promise<void> {
  const { prisma, tenantId } = ctx;
  for (const [index, spec] of EMPLOYEES.entries()) {
    const id = employeeId(spec.key);
    const provinceId = ctx.provinces.get(spec.province) ?? null;
    const districtId = ctx.districts.get(`${spec.province}/${spec.district}`) ?? null;
    let photoKey: string | null = null;
    if (spec.photo && ctx.storage) {
      photoKey = `${tenantId}/employees/${id}/photo-${uid(`photo:${spec.key}`)}.jpg`;
      await ctx.storage.put(photoKey, await portraitJpeg(spec.first, spec.last), 'image/jpeg');
    }
    const registered = spec.hire ? dateOnly(...spec.hire) : daysAgo(0);
    const createdAt = registered < daysAgo(95) ? daysAgo(95 - (index % 20)) : registered;
    await prisma.employee.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        companyId: spec.company ? companyId(spec.company) : null,
        branchId: spec.branch ? branchId(spec.branch) : null,
        workplaceId: spec.workplace ? workplaceId(spec.workplace) : null,
        nationalId: spec.passport ? null : tcKimlikNo(spec.key),
        registrationNumber: spec.company
          ? `${spec.company.slice(0, 3).toUpperCase()}-${String(1000 + index)}`
          : null,
        passportNumber: spec.passport ?? null,
        firstName: spec.first,
        lastName: spec.last,
        birthDate: dateOnly(...spec.birth),
        gender: spec.gender,
        motherName: spec.mother,
        fatherName: spec.father,
        phone: gsm(spec.key),
        homePhone: index % 3 === 0 ? landline(spec.key, provinceId === 34 ? '216' : '262') : null,
        email: `${spec.key.replace('-', '.')}@example.com`,
        addressProvinceId: provinceId,
        addressDistrictId: districtId,
        addressNeighborhoodId: districtId ? (ctx.neighborhoods.get(districtId) ?? null) : null,
        addressLine: spec.addressLine,
        notes: spec.notes ?? null,
        jobTitle: spec.jobTitle ?? spec.occupation ?? null,
        occupationId: spec.occupation ? (ctx.occupations.get(spec.occupation) ?? null) : null,
        department: spec.department ?? null,
        hireDate: spec.hire ? dateOnly(...spec.hire) : null,
        status: spec.status ?? 'ACTIVE',
        identityVerificationStatus: spec.identity ?? 'UNVERIFIED',
        identityVerifiedAt:
          spec.identity === 'VERIFIED' || spec.identity === 'MANUAL' ? createdAt : null,
        identityVerificationSource:
          spec.identity === 'VERIFIED'
            ? 'nvi-kps-public'
            : spec.identity === 'MANUAL'
              ? 'manual'
              : null,
        photoKey,
        photoUpdatedAt: photoKey ? createdAt : null,
        createdAt,
      },
      update: { photoKey, photoUpdatedAt: photoKey ? createdAt : null },
    });
  }
  // Soft-deleted patient (duplicate registration cleaned up).
  await prisma.employee.upsert({
    where: { id: employeeId('silinen') },
    create: {
      id: employeeId('silinen'),
      tenantId,
      firstName: 'Mehmet',
      lastName: 'Kaya',
      companyId: companyId('demir'),
      jobTitle: 'Kaynakçı',
      notes: 'Mükerrer kayıt - silindi',
      createdAt: daysAgo(50),
      deletedAt: daysAgo(49),
    },
    update: {},
  });
  console.log(`✔ ${EMPLOYEES.length} employees (+1 soft-deleted)`);
}

export function employeeSpec(key: string): EmployeeSpec {
  const spec = EMPLOYEES.find((e) => e.key === key);
  if (!spec) throw new Error(`Unknown demo employee ${key}`);
  return spec;
}

export function birthDateOf(key: string): Date {
  return dateOnly(...employeeSpec(key).birth);
}

export { yearsAgoDate };
