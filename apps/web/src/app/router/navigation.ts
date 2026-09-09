import {
  Activity,
  ArrowLeftRight,
  BadgeCheck,
  Briefcase,
  Building,
  Building2,
  Calculator,
  ClipboardList,
  Database,
  Ear,
  Eye,
  FileHeart,
  FileText,
  FileUp,
  FlaskConical,
  GitCompare,
  KeyRound,
  Layers,
  LayoutGrid,
  Network,
  Package,
  PenLine,
  ScanLine,
  Settings,
  ShieldCheck,
  Stethoscope,
  TestTubes,
  Upload,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  Wind,
} from 'lucide-react';
import { PERMISSIONS } from '@osgb/shared-types';
import { isNavSection, type NavEntry, type NavLeaf, type NavSection } from '@/types/navigation';

/** Route paths — the single place URL strings are defined. */
export const PATHS = {
  login: '/login',
  dashboard: '/dashboard',

  // Hasta Kayıt Kabul
  patients: '/patient-registration/patients',
  patientNew: '/patient-registration/patients/new',
  patientDetail: '/patient-registration/patients/:patientId',
  patientEdit: '/patient-registration/patients/:patientId/edit',
  protocols: '/patient-registration/protocols',
  protocolDetail: '/patient-registration/protocols/:protocolId',
  documentSigning: '/patient-registration/document-signing',
  examinationComparison: '/patient-registration/examination-comparison',

  // Doktor Modülü
  radiology: '/doctor/radiology',
  radiologyStudy: '/doctor/radiology/:requestId',
  audiometry: '/doctor/audiometry',
  audiometryNew: '/doctor/audiometry/new',
  audiometryTest: '/doctor/audiometry/:testId',
  ecg: '/doctor/ecg',
  ecgNew: '/doctor/ecg/new',
  ecgRecord: '/doctor/ecg/:recordId',
  spirometry: '/doctor/spirometry',
  spirometryNew: '/doctor/spirometry/new',
  spirometryTest: '/doctor/spirometry/:testId',
  eye: '/doctor/eye',
  eyeNew: '/doctor/eye/new',
  eyeExamination: '/doctor/eye/:examId',
  pneumoconiosis: '/doctor/pneumoconiosis',
  pneumoconiosisNew: '/doctor/pneumoconiosis/new',
  pneumoconiosisReading: '/doctor/pneumoconiosis/:readingId',
  healthReports: '/doctor/health-reports',
  healthReport: '/doctor/health-reports/:examinationId',
  isgReports: '/doctor/isg-reports',
  labResults: '/doctor/lab-results',
  reportTemplates: '/doctor/report-templates',
  eSignature: '/doctor/e-signature',

  // Genel Ayarlar
  organization: '/settings/organization',
  companies: '/settings/companies',
  companyDetail: '/settings/companies/:companyId',
  doctors: '/settings/doctors',
  doctorPayouts: '/settings/doctor-payouts',
  tests: '/settings/tests',
  testPackages: '/settings/test-packages',
  occupations: '/settings/occupations',
  bulkPatientImport: '/settings/bulk-patient-import',
  bulkCompanyImport: '/settings/bulk-company-import',
  staff: '/settings/staff',
  staffMovements: '/settings/staff-movements',
  activeUsers: '/settings/active-users',
  kvkkPermissions: '/settings/kvkk-permissions',
  accounting: '/settings/accounting',
  dicomRecords: '/settings/dicom-records',
  subOsgb: '/settings/sub-osgb',
} as const;

const todo = (subject: string) => `${subject} bu modül altında yer alacak.`;

/** Sidebar tree. Order follows the product specification. */
export const NAV_TREE: NavEntry[] = [
  {
    path: PATHS.dashboard,
    label: 'Dashboard',
    icon: LayoutGrid,
    description: 'Genel bakış ve özet göstergeler bu alanda yer alacak.',
  },
  {
    id: 'patient-registration',
    label: 'Hasta Kayıt Kabul',
    icon: UserPlus,
    basePath: '/patient-registration',
    children: [
      {
        path: PATHS.patients,
        label: 'Hasta Kayıt',
        icon: UserPlus,
        description: todo('Hasta kayıt ve kabul işlemleri'),
        permission: PERMISSIONS.EMPLOYEES_READ,
      },
      {
        path: PATHS.protocols,
        label: 'Protokol Listesi',
        icon: ClipboardList,
        description: 'Ziyaret protokolleri, istenen tetkikler ve durum takibi.',
        permission: PERMISSIONS.EXAMINATIONS_READ,
      },
      {
        path: PATHS.documentSigning,
        label: 'Belge İmza',
        icon: PenLine,
        description: 'Rıza metinleri ve PDF formlar için imza pedinde imza alma.',
        permission: PERMISSIONS.DOCUMENTS_READ,
      },
      {
        path: PATHS.examinationComparison,
        label: 'Muayene Karşılaştırma',
        icon: GitCompare,
        description: 'Muayeneleri yan yana karşılaştırın: karar, ölçümler ve bulgular.',
        permission: PERMISSIONS.EXAMINATIONS_READ,
      },
    ],
  },
  {
    id: 'doctor',
    label: 'Doktor Modülü',
    icon: Stethoscope,
    basePath: '/doctor',
    children: [
      {
        path: PATHS.radiology,
        label: 'Radyoloji',
        icon: ScanLine,
        description: 'Radyoloji istekleri, PACS bağlantısı, görüntüleyici ve rapor.',
        permission: PERMISSIONS.RADIOLOGY_READ,
      },
      {
        path: PATHS.audiometry,
        label: 'Odyometri',
        icon: Ear,
        description: 'Saf ses odyometri: eşikler, odyogram, işitme derecesi ve eşik kayması.',
        permission: PERMISSIONS.AUDIOMETRY_READ,
      },
      {
        path: PATHS.ecg,
        label: 'EKG',
        icon: Activity,
        description: 'İstirahat EKG kayıtları, otomatik uyarılar ve cihaz çıktıları.',
        permission: PERMISSIONS.ECG_READ,
      },
      {
        path: PATHS.spirometry,
        label: 'Spirometri',
        icon: Wind,
        description: 'Solunum fonksiyon testleri, beklenen değerler, patern ve FEV1 izlemi.',
        permission: PERMISSIONS.SPIROMETRY_READ,
      },
      {
        path: PATHS.eye,
        label: 'Göz',
        icon: Eye,
        description: 'Görme keskinliği, renk görme, görme alanı ve öneri.',
        permission: PERMISSIONS.EYE_READ,
      },
      {
        path: PATHS.pneumoconiosis,
        label: 'Pnömokonyoz',
        icon: Layers,
        description: 'ILO 2011 akciğer grafisi okumaları ve ilerleme takibi.',
        permission: PERMISSIONS.PNEUMOCONIOSIS_READ,
      },
      {
        path: PATHS.healthReports,
        label: 'Sağlık Raporları',
        icon: FileHeart,
        description: 'Muayene raporları: anamnez, fizik muayene, tetkikler, karar ve onaylı PDF.',
        permission: PERMISSIONS.EXAMINATIONS_READ,
      },
      {
        path: PATHS.isgReports,
        label: 'İSG Raporları',
        icon: ShieldCheck,
        description: todo('İSG raporları'),
        permission: PERMISSIONS.REPORTS_EXPORT,
      },
      {
        path: PATHS.labResults,
        label: 'Lab. Tahlilleri',
        icon: FlaskConical,
        description: todo('Laboratuvar tahlilleri'),
        permission: PERMISSIONS.EXAMINATIONS_READ,
      },
      {
        path: PATHS.reportTemplates,
        label: 'Rapor Şablonları',
        icon: FileText,
        description: todo('Rapor şablonları'),
        permission: PERMISSIONS.REPORTS_EXPORT,
      },
      {
        path: PATHS.eSignature,
        label: 'E-İmza',
        icon: BadgeCheck,
        description: todo('E-imza işlemleri'),
        permission: PERMISSIONS.EXAMINATIONS_APPROVE,
      },
    ],
  },
  {
    id: 'settings',
    label: 'Genel Ayarlar',
    icon: Settings,
    basePath: '/settings',
    children: [
      {
        path: PATHS.organization,
        label: 'Kurum Bilgileri',
        icon: Building2,
        description: 'OSGB kimliği, yetki belgesi, iletişim ve logo.',
        permission: PERMISSIONS.SYSTEM_MANAGE,
      },
      {
        path: PATHS.companies,
        label: 'Firma Tanımları',
        icon: Building,
        description: 'İşverenler, şubeleri ve SGK sicilli işyerleri.',
        permission: PERMISSIONS.COMPANIES_READ,
      },
      {
        path: PATHS.doctors,
        label: 'Doktor Tanımları',
        icon: UserCog,
        description: 'Hekimler, unvan ve belge numaraları, imza görseli.',
        permission: PERMISSIONS.PHYSICIANS_READ,
      },
      {
        path: PATHS.doctorPayouts,
        label: 'Doktor Hakediş',
        icon: Wallet,
        description: todo('Doktor hakediş hesaplamaları'),
        permission: PERMISSIONS.SYSTEM_MANAGE,
      },
      {
        path: PATHS.tests,
        label: 'Tetkik Tanımları',
        icon: TestTubes,
        description: 'Tetkik kataloğu, kategoriler ve liste fiyatları.',
        permission: PERMISSIONS.TESTS_READ,
      },
      {
        path: PATHS.testPackages,
        label: 'Tetkik Paketleri',
        icon: Package,
        description: 'Tetkik tanımlarından hazır setler ve paket fiyatları.',
        permission: PERMISSIONS.TESTS_READ,
      },
      {
        path: PATHS.occupations,
        label: 'Meslek Tanımları',
        icon: Briefcase,
        description: 'Hasta kaydında seçilen meslek kataloğu.',
        permission: PERMISSIONS.OCCUPATIONS_READ,
      },
      {
        path: PATHS.bulkPatientImport,
        label: 'Toplu Hasta Aktarma',
        icon: Upload,
        description: 'Excel/CSV listesinden doğrulamalı hasta aktarımı.',
        permission: PERMISSIONS.EMPLOYEES_CREATE,
      },
      {
        path: PATHS.bulkCompanyImport,
        label: 'Toplu Firma Aktarma',
        icon: FileUp,
        description: 'Excel/CSV listesinden doğrulamalı firma aktarımı.',
        permission: PERMISSIONS.COMPANIES_CREATE,
      },
      {
        path: PATHS.staff,
        label: 'Personel Tanımları',
        icon: Users,
        description: 'Kullanıcılar, rolleri ve yetkileri.',
        permission: PERMISSIONS.USERS_READ,
      },
      {
        path: PATHS.staffMovements,
        label: 'Personel Hareketleri',
        icon: ArrowLeftRight,
        description: 'Kullanıcı işlemlerinin denetim izi: giriş, kayıt, değişiklik, erişim.',
        permission: PERMISSIONS.AUDIT_READ,
      },
      {
        path: PATHS.activeUsers,
        label: 'Aktif Kullanıcılar',
        icon: UserCheck,
        description: 'Açık oturumlar; cihaz, IP ve uzaktan kapatma.',
        permission: PERMISSIONS.USERS_READ,
      },
      {
        path: PATHS.kvkkPermissions,
        label: 'KVKK İzinleri',
        icon: KeyRound,
        description: 'Aydınlatma ve açık rıza metinleri, hasta rızaları.',
        permission: PERMISSIONS.CONSENTS_READ,
      },
      {
        path: PATHS.accounting,
        label: 'Ön Muhasebe',
        icon: Calculator,
        description: todo('Ön muhasebe işlemleri'),
        permission: PERMISSIONS.SYSTEM_MANAGE,
      },
      {
        path: PATHS.dicomRecords,
        label: 'DICOM Kayıtları',
        icon: Database,
        description: todo('DICOM kayıtları'),
        permission: PERMISSIONS.RADIOLOGY_READ,
      },
      {
        path: PATHS.subOsgb,
        label: 'Alt OSGB Tanımları',
        icon: Network,
        description: todo('Alt OSGB tanımları'),
        permission: PERMISSIONS.SYSTEM_MANAGE,
      },
    ],
  },
];

export const NAV_LEAVES: NavLeaf[] = NAV_TREE.flatMap((entry) =>
  isNavSection(entry) ? entry.children : [entry],
);

function matches(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Leaf whose path is a prefix of the current location (titles / active states). */
export function findNavLeaf(pathname: string): NavLeaf | undefined {
  return NAV_LEAVES.find((leaf) => matches(pathname, leaf.path));
}

/** Section containing the current location, if any. */
export function findNavSection(pathname: string): NavSection | undefined {
  return NAV_TREE.filter(isNavSection).find((section) => matches(pathname, section.basePath));
}
