import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@osgb/shared-types';
import { TooltipProvider } from '@/components/ui/tooltip';
import { setSidebarCollapsed } from '@/lib/sidebar-state';
import type * as ApiClientModule from '@/services/api-client';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { adminUser, loginResponse, signInAs } from '@/test/auth-fixtures';
import { NAV_LEAVES } from './navigation';
import { routes } from './routes';

vi.mock('@/services/operations.service', () => ({
  operationsService: {
    list: vi
      .fn()
      .mockResolvedValue({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }),
    summary: vi.fn().mockResolvedValue({ states: [], balanceCents: null }),
    dashboard: vi.fn().mockResolvedValue({ patients: 0, companies: 0, protocols: 0, reports: 0 }),
    options: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/services/auth.service', () => ({
  authService: { login: vi.fn(), refresh: vi.fn(), logout: vi.fn(), me: vi.fn() },
}));
// SessionProvider exchanges the refresh token on mount. The real call would hit the network and,
// failing asynchronously in jsdom, clear the session mid-test (a race every list test could lose).
vi.mock('@/services/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClientModule>()),
  refreshAccessToken: vi.fn().mockResolvedValue('access-token'),
}));
vi.mock('@/services/patients.service', () => ({
  patientsService: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'p1',
          firstName: 'Ayşe',
          lastName: 'Yılmaz',
          nationalId: '10000000146',
          registrationNumber: 'S-1',
          phone: '5321234567',
          birthDate: '1990-01-15',
          status: 'ACTIVE',
          identityVerificationStatus: 'VERIFIED',
          company: { id: 'c1', name: 'Örnek A.Ş.' },
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    get: vi.fn().mockResolvedValue({
      id: 'p1',
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      nationalId: '10000000146',
      registrationNumber: 'S-1',
      phone: '5321234567',
      birthDate: '1990-01-15',
      status: 'ACTIVE',
      identityVerificationStatus: 'VERIFIED',
      company: { id: 'c1', name: 'Örnek A.Ş.' },
    }),
  },
}));
// vi.mock factories are hoisted, so shared fixtures must be hoisted too.
const { protocolFixture } = vi.hoisted(() => ({
  protocolFixture: {
    id: 'pr1',
    protocolNumber: '2026-000001',
    employeeId: 'p1',
    companyId: 'c1',
    type: 'PRE_EMPLOYMENT',
    status: 'IN_PROGRESS',
    openedAt: '2026-09-09T08:00:00.000Z',
    closedAt: null,
    notes: null,
    createdAt: '2026-09-09T08:00:00.000Z',
    updatedAt: '2026-09-09T08:00:00.000Z',
    employee: {
      id: 'p1',
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      nationalId: '10000000146',
      registrationNumber: 'S-1',
      birthDate: '1990-01-15',
      phone: '5321234567',
    },
    company: { id: 'c1', name: 'Örnek A.Ş.' },
    openedBy: { id: 'u1', firstName: 'Demo', lastName: 'Admin' },
    closedBy: null,
    examinations: [],
    items: [
      {
        id: 'i1',
        type: 'LAB',
        status: 'DONE',
        note: null,
        completedAt: '2026-09-09T09:00:00.000Z',
        orderIndex: 0,
      },
      {
        id: 'i2',
        type: 'RADIOLOGY',
        status: 'PENDING',
        note: null,
        completedAt: null,
        orderIndex: 1,
      },
    ],
  },
}));
vi.mock('@/services/protocols.service', () => ({
  protocolsService: {
    list: vi.fn().mockResolvedValue({
      items: [protocolFixture],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    get: vi.fn().mockResolvedValue(protocolFixture),
    worklist: vi.fn().mockResolvedValue([]),
    records: vi.fn().mockResolvedValue({
      audiometry: [],
      spirometry: [],
      eye: [],
      ecg: [],
      pneumoconiosis: [],
      radiology: [],
      healthReport: null,
    }),
  },
}));
const { companyFixture } = vi.hoisted(() => ({
  companyFixture: {
    id: 'c1',
    name: 'Örnek A.Ş.',
    taxNumber: '1234567890',
    sgkRegistrationNumber: null,
    hazardClass: 'HAZARDOUS',
    address: null,
    phone: '0212 555 00 00',
    email: null,
    createdAt: '2026-09-09T08:00:00.000Z',
    updatedAt: '2026-09-09T08:00:00.000Z',
    _count: { employees: 12, branches: 1 },
    branches: [{ id: 'b1', companyId: 'c1', name: 'Merkez', address: null, phone: null }],
    workplaces: [
      {
        id: 'w1',
        companyId: 'c1',
        branchId: 'b1',
        name: 'Fabrika',
        sgkRegistrationNumber: '1234',
        hazardClass: 'VERY_HAZARDOUS',
        naceCode: '25.11',
        address: null,
        employeeCount: 40,
      },
    ],
  },
}));
vi.mock('@/services/companies.service', () => ({
  companiesService: {
    list: vi.fn().mockResolvedValue({
      items: [{ id: 'c1', name: 'Örnek A.Ş.' }],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    }),
    page: vi.fn().mockResolvedValue({
      items: [companyFixture],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    get: vi.fn().mockResolvedValue(companyFixture),
  },
  branchesService: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  workplacesService: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/services/users.service', () => ({
  usersService: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'u1',
          email: 'admin@demo.local',
          firstName: 'Demo',
          lastName: 'Admin',
          status: 'ACTIVE',
          lastLoginAt: '2026-09-09T07:00:00.000Z',
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
          userRoles: [{ role: { id: 'r1', name: 'tenant_admin' } }],
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    create: vi.fn(),
    update: vi.fn(),
    assignRoles: vi.fn(),
    setPassword: vi.fn(),
  },
  rolesService: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'r1',
        name: 'tenant_admin',
        description: 'Full access',
        isSystem: true,
        permissions: ['users.read', 'roles.manage'],
        userCount: 1,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ]),
    create: vi.fn(),
    update: vi.fn(),
    setPermissions: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('@/services/organization.service', () => ({
  organizationService: {
    get: vi.fn().mockResolvedValue({
      id: 't-demo',
      name: 'Demo OSGB',
      slug: 'demo',
      status: 'ACTIVE',
      profile: {
        id: 'op1',
        legalName: 'Demo OSGB Ltd. Şti.',
        taxOffice: 'Kadıköy',
        taxNumber: '1234567890',
        sgkRegistrationNumber: null,
        authorizationNumber: 'OSGB-0001',
        authorizationDate: '2024-03-01T00:00:00.000Z',
        responsibleManager: null,
        phone: null,
        fax: null,
        email: null,
        website: null,
        addressProvinceId: null,
        addressDistrictId: null,
        addressLine: null,
        reportFooter: null,
        logoUpdatedAt: null,
        addressProvince: null,
        addressDistrict: null,
      },
    }),
    update: vi.fn(),
    setLogo: vi.fn(),
    logo: vi.fn().mockResolvedValue(null),
    removeLogo: vi.fn(),
  },
}));
vi.mock('@/services/physicians.service', () => ({
  physiciansService: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'd1',
          userId: null,
          title: 'Uzm. Dr.',
          firstName: 'Ayşe',
          lastName: 'Demir',
          specialty: 'İşyeri Hekimi',
          diplomaNumber: 'D-1001',
          diplomaRegistrationNumber: 'T-55',
          certificateNumber: 'IH-2020-7',
          phone: null,
          email: null,
          signatureUpdatedAt: '2026-09-09T08:00:00.000Z',
          status: 'ACTIVE',
          notes: null,
          createdAt: '2026-09-09T08:00:00.000Z',
          updatedAt: '2026-09-09T08:00:00.000Z',
          user: null,
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    setSignature: vi.fn(),
    signature: vi.fn().mockResolvedValue(null),
    removeSignature: vi.fn(),
  },
}));
vi.mock('@/services/tests.service', () => ({
  testsService: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'x1',
          code: 'LAB-HGB',
          name: 'Hemogram',
          category: 'LAB',
          unitPrice: '150.50',
          vatRate: 10,
          durationMinutes: null,
          sampleType: 'Kan',
          referenceRange: '12-16',
          unit: 'g/dL',
          isActive: true,
          sortOrder: 0,
          notes: null,
          createdAt: '2026-09-09T08:00:00.000Z',
          updatedAt: '2026-09-09T08:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    }),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('@/services/test-packages.service', () => ({
  testPackagesService: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'pk1',
          code: 'PKT-ISE-GIRIS',
          name: 'İşe Giriş Standart',
          description: null,
          price: '900.00',
          vatRate: 10,
          isActive: true,
          sortOrder: 0,
          items: [
            {
              id: 'i1',
              testId: 'x1',
              quantity: 1,
              orderIndex: 0,
              test: {
                id: 'x1',
                code: 'LAB-HGB',
                name: 'Hemogram',
                category: 'LAB',
                unitPrice: '150.50',
                vatRate: 10,
                isActive: true,
              },
            },
            {
              id: 'i2',
              testId: 'x2',
              quantity: 1,
              orderIndex: 1,
              test: {
                id: 'x2',
                code: 'RAD-PA',
                name: 'Akciğer grafisi',
                category: 'RADIOLOGY',
                unitPrice: '850.00',
                vatRate: 10,
                isActive: true,
              },
            },
          ],
          totals: { net: 900, gross: 990, itemsNet: 1000.5, discount: 100.5 },
          createdAt: '2026-09-09T08:00:00.000Z',
          updatedAt: '2026-09-09T08:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('@/services/occupations.service', () => ({
  occupationsService: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'o1',
          code: '7212',
          name: 'Kaynakçı',
          description: 'Kaynak dumanı, göz',
          isActive: true,
          createdAt: '2026-09-09T08:00:00.000Z',
          updatedAt: '2026-09-09T08:00:00.000Z',
          _count: { employees: 3 },
        },
      ],
      meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    }),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    importDefaults: vi.fn(),
  },
}));
vi.mock('@/services/audit.service', () => ({
  auditService: {
    activity: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'a1',
          userId: 'u1',
          action: 'CREATE',
          entityType: 'Employee',
          entityId: 'e1e1e1e1-0000-4000-8000-000000000000',
          oldValue: null,
          newValue: { status: 'ACTIVE' },
          ipAddress: '10.0.0.5',
          userAgent: 'vitest',
          requestId: 'req-1',
          metadata: null,
          createdAt: '2026-09-09T09:30:00.000Z',
          user: { id: 'u1', firstName: 'Demo', lastName: 'Admin', email: 'admin@demo.local' },
          category: 'PATIENT',
          technical: false,
          entityLabel: 'Ayşe Yılmaz',
          patientId: 'e1e1e1e1-0000-4000-8000-000000000000',
        },
        {
          id: 'a2',
          userId: 'u1',
          action: 'LOGIN_FAILED',
          entityType: 'Auth',
          entityId: null,
          oldValue: null,
          newValue: null,
          ipAddress: '10.0.0.5',
          userAgent: 'vitest',
          requestId: 'req-2',
          metadata: null,
          createdAt: '2026-09-09T09:00:00.000Z',
          user: { id: 'u1', firstName: 'Demo', lastName: 'Admin', email: 'admin@demo.local' },
          category: 'FAILURE',
          technical: false,
          entityLabel: null,
          patientId: null,
        },
      ],
      meta: { page: 1, pageSize: 50, total: 2, totalPages: 1 },
    }),
    activitySummary: vi.fn().mockResolvedValue([
      {
        userId: 'u1',
        user: {
          id: 'u1',
          firstName: 'Demo',
          lastName: 'Admin',
          email: 'admin@demo.local',
          status: 'ACTIVE',
        },
        counts: {
          SESSION: 1,
          PATIENT: 1,
          PROTOCOL: 0,
          TEST: 0,
          REPORT: 0,
          DOCUMENT: 0,
          DEFINITION: 0,
          ACCESS: 0,
          FAILURE: 1,
          OTHER: 0,
        },
        total: 3,
        lastActivityAt: '2026-09-09T09:30:00.000Z',
        lastLoginAt: '2026-09-09T08:00:00.000Z',
      },
    ]),
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'a1',
          userId: 'u1',
          action: 'UPDATE',
          entityType: 'Employee',
          entityId: 'e1e1e1e1-0000-4000-8000-000000000000',
          oldValue: { status: 'ACTIVE' },
          newValue: { status: 'ON_LEAVE' },
          ipAddress: '10.0.0.5',
          userAgent: 'vitest',
          requestId: 'req-1',
          metadata: {
            method: 'PATCH',
            path: '/api/employees/e1',
            statusCode: 200,
            outcome: 'SUCCESS',
            durationMs: 12,
          },
          createdAt: '2026-09-09T09:30:00.000Z',
          user: { id: 'u1', firstName: 'Demo', lastName: 'Admin', email: 'admin@demo.local' },
        },
        {
          id: 'a2',
          userId: 'u1',
          action: 'LOGIN_FAILED',
          entityType: 'Auth',
          entityId: null,
          oldValue: null,
          newValue: null,
          ipAddress: '10.0.0.5',
          userAgent: 'vitest',
          requestId: 'req-2',
          metadata: null,
          createdAt: '2026-09-09T09:00:00.000Z',
          user: { id: 'u1', firstName: 'Demo', lastName: 'Admin', email: 'admin@demo.local' },
        },
      ],
      meta: { page: 1, pageSize: 50, total: 2, totalPages: 1 },
    }),
  },
}));
vi.mock('@/services/sessions.service', () => ({
  sessionsService: {
    list: vi.fn().mockResolvedValue([
      {
        id: 's1',
        userId: 'u-admin',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/128.0 Safari/537.36',
        ipAddress: '10.0.0.5',
        expiresAt: '2026-09-16T09:00:00.000Z',
        createdAt: '2026-09-09T09:00:00.000Z',
        updatedAt: '2026-09-09T09:00:00.000Z',
        current: true,
        user: {
          id: 'u-admin',
          firstName: 'Demo',
          lastName: 'Admin',
          email: 'admin@demo.local',
          status: 'ACTIVE',
          lastLoginAt: null,
        },
      },
      {
        id: 's2',
        userId: 'u-admin',
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
        ipAddress: '10.0.0.9',
        expiresAt: '2026-09-16T08:00:00.000Z',
        createdAt: '2026-09-09T08:00:00.000Z',
        updatedAt: '2026-09-09T08:00:00.000Z',
        current: false,
        user: {
          id: 'u-admin',
          firstName: 'Demo',
          lastName: 'Admin',
          email: 'admin@demo.local',
          status: 'ACTIVE',
          lastLoginAt: null,
        },
      },
    ]),
    revoke: vi.fn(),
    revokeAllForUser: vi.fn(),
  },
}));
vi.mock('@/services/consents.service', () => ({
  consentsService: {
    templates: vi.fn().mockResolvedValue([
      {
        id: 't1',
        type: 'DISCLOSURE',
        version: 2,
        title: 'Aydınlatma Metni',
        body: 'Metin…',
        effectiveFrom: '2026-09-01T00:00:00.000Z',
        isActive: true,
        createdAt: '2026-09-01T00:00:00.000Z',
        _count: { consents: 5 },
      },
    ]),
    publishTemplate: vi.fn(),
    importDefaults: vi.fn(),
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'c1',
          employeeId: 'p1',
          templateId: 't1',
          status: 'GIVEN',
          method: 'SIGNATURE_PAD',
          givenAt: '2026-09-09T08:00:00.000Z',
          withdrawnAt: null,
          withdrawReason: null,
          note: null,
          template: { id: 't1', type: 'DISCLOSURE', version: 2, title: 'Aydınlatma Metni' },
          employee: { id: 'p1', firstName: 'Ayşe', lastName: 'Yılmaz', nationalId: '10000000146' },
          collectedBy: { id: 'u1', firstName: 'Demo', lastName: 'Admin' },
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    summary: vi.fn().mockResolvedValue([]),
    give: vi.fn(),
    withdraw: vi.fn(),
  },
}));
vi.mock('@/services/signatures.service', () => ({
  signaturesService: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 's1',
          documentId: 'd1',
          employeeId: 'p1',
          consentId: 'c1',
          title: 'Aydınlatma Metni (v2)',
          signerName: 'Ayşe Yılmaz',
          signedAt: '2026-09-09T08:00:00.000Z',
          sha256: 'abc',
          createdAt: '2026-09-09T08:00:00.000Z',
          document: { id: 'd1', fileName: 'x.pdf', sizeBytes: 1000, category: 'SIGNED_FORM' },
          employee: { id: 'p1', firstName: 'Ayşe', lastName: 'Yılmaz', nationalId: '10000000146' },
          consent: { id: 'c1', status: 'GIVEN', template: { type: 'DISCLOSURE', version: 2 } },
          collectedBy: { id: 'u1', firstName: 'Demo', lastName: 'Admin' },
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    consentForm: vi.fn(),
    signConsent: vi.fn(),
    signUpload: vi.fn(),
    downloadUrl: vi.fn(),
    verify: vi.fn(),
  },
}));
vi.mock('@/services/examinations.service', () => ({
  examinationsService: {
    timeline: vi.fn().mockResolvedValue([
      {
        id: 'e2',
        type: 'PERIODIC',
        status: 'COMPLETED',
        scheduledAt: null,
        performedAt: '2026-09-01T08:00:00.000Z',
        createdAt: '2026-09-01T08:00:00.000Z',
        date: '2026-09-01T08:00:00.000Z',
        fitnessDecision: 'FIT',
        nextExaminationDue: null,
        protocol: { id: 'pr2', protocolNumber: '2026-000002' },
        physician: null,
        _count: { measurements: 2 },
      },
      {
        id: 'e1',
        type: 'PRE_EMPLOYMENT',
        status: 'APPROVED',
        scheduledAt: null,
        performedAt: '2025-09-01T08:00:00.000Z',
        createdAt: '2025-09-01T08:00:00.000Z',
        date: '2025-09-01T08:00:00.000Z',
        fitnessDecision: 'FIT',
        nextExaminationDue: null,
        protocol: null,
        physician: null,
        _count: { measurements: 2 },
      },
    ]),
    compare: vi.fn().mockResolvedValue({
      employee: {
        id: 'p1',
        firstName: 'Ayşe',
        lastName: 'Yılmaz',
        nationalId: '10000000146',
        birthDate: '1990-01-15',
      },
      examinations: [
        {
          id: 'e1',
          type: 'PRE_EMPLOYMENT',
          status: 'APPROVED',
          scheduledAt: null,
          performedAt: '2025-09-01T08:00:00.000Z',
          createdAt: '2025-09-01T08:00:00.000Z',
          date: '2025-09-01T08:00:00.000Z',
          fitnessDecision: 'FIT',
          restrictions: null,
          findings: 'Normal',
          conclusion: null,
          nextExaminationDue: null,
          approvedAt: null,
          protocol: null,
          physician: null,
          approvedBy: null,
          measurements: {
            WEIGHT: { value: 80, note: null, recordedAt: '2025-09-01T08:00:00.000Z' },
            SYSTOLIC: { value: 120, note: null, recordedAt: '2025-09-01T08:00:00.000Z' },
          },
        },
        {
          id: 'e2',
          type: 'PERIODIC',
          status: 'COMPLETED',
          scheduledAt: null,
          performedAt: '2026-09-01T08:00:00.000Z',
          createdAt: '2026-09-01T08:00:00.000Z',
          date: '2026-09-01T08:00:00.000Z',
          fitnessDecision: 'FIT',
          restrictions: null,
          findings: 'Normal',
          conclusion: null,
          nextExaminationDue: null,
          approvedAt: null,
          protocol: {
            id: 'pr2',
            protocolNumber: '2026-000002',
            items: [{ type: 'LAB', status: 'DONE' }],
          },
          physician: null,
          approvedBy: null,
          measurements: {
            WEIGHT: { value: 82.5, note: null, recordedAt: '2026-09-01T08:00:00.000Z' },
            SYSTOLIC: { value: 150, note: null, recordedAt: '2026-09-01T08:00:00.000Z' },
          },
        },
      ],
      keys: ['WEIGHT', 'SYSTOLIC'],
    }),
    setMeasurements: vi.fn(),
  },
}));
const { radiologyFixture } = vi.hoisted(() => ({
  radiologyFixture: {
    id: 'rr1',
    employeeId: 'p1',
    examinationId: null,
    modality: 'CR',
    status: 'COMPLETED',
    bodyPart: 'Akciğer PA',
    clinicalInfo: 'Periyodik muayene',
    accessionNumber: 'NL0123456789ABCD',
    worklistId: 'wl-1',
    worklistStatus: 'REMOVED',
    worklistSyncedAt: '2026-09-09T09:00:00.000Z',
    worklistAttemptCount: 1,
    worklistNextAttemptAt: null,
    worklistLastError: null,
    orthancStudyId: 'orth-1',
    studyInstanceUid: '1.2.3.4',
    requestedAt: '2026-09-09T08:00:00.000Z',
    completedAt: '2026-09-09T09:00:00.000Z',
    reportedById: null,
    reportedAt: null,
    createdAt: '2026-09-09T08:00:00.000Z',
    updatedAt: '2026-09-09T09:00:00.000Z',
    employee: { id: 'p1', firstName: 'Ayşe', lastName: 'Yılmaz', nationalId: '10000000146' },
    reportText: null,
    viewerUrl: '/viewer/viewer?StudyInstanceUIDs=1.2.3.4',
    previewUrl: '/api/radiology/rr1/preview',
  },
}));
vi.mock('@/services/radiology.service', () => ({
  radiologyService: {
    list: vi.fn().mockResolvedValue({
      items: [radiologyFixture],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    get: vi.fn().mockResolvedValue(radiologyFixture),
    create: vi.fn(),
    cancel: vi.fn(),
    retryWorklist: vi.fn(),
    operationsStatus: vi.fn().mockResolvedValue({
      checkedAt: '2026-09-12T09:00:00.000Z',
      connection: 'ONLINE',
      name: 'Orthanc',
      version: '1.12.10',
      dicomAet: 'OSGB',
      dicomPort: 4242,
      stationAet: 'XRAY01',
      maxWorklistAttempts: 5,
      awaitingStudy: 1,
      pendingWorklists: 0,
      publishedWorklists: 1,
      failedWorklists: 0,
      exhaustedWorklists: 0,
      completedToday: 1,
      lastWorklistSyncAt: '2026-09-12T08:55:00.000Z',
    }),
    reconcile: vi.fn().mockResolvedValue({ checked: 0, linked: 0, ambiguous: 0, waiting: 0 }),
    linkStudy: vi.fn(),
    report: vi.fn(),
    study: vi.fn().mockResolvedValue({
      orthancStudyId: 'orth-1',
      studyInstanceUid: '1.2.3.4',
      studyDate: '2026-09-09',
      studyTime: '09:00',
      description: 'CHEST',
      accessionNumber: null,
      modalities: ['CR'],
      seriesCount: 1,
      instanceCount: 1,
      patientId: 'p1',
      patientName: 'AYŞE YILMAZ',
      patientBirthDate: '1990-01-15',
      isStable: true,
    }),
    candidates: vi.fn().mockResolvedValue([]),
    unlinked: vi.fn().mockResolvedValue([
      {
        requestId: 'rr1',
        orthancStudyId: 'orth-2',
        studyInstanceUid: '1.2.3.5',
        studyDate: '2026-09-08',
        studyTime: null,
        description: 'LOMBER',
        accessionNumber: null,
        modalities: ['DX'],
        seriesCount: 1,
        instanceCount: 2,
        patientId: null,
        patientName: 'TEST WORKER',
        patientBirthDate: null,
        isStable: true,
      },
    ]),
    viewerSession: vi.fn(),
    preview: vi.fn().mockResolvedValue(null),
  },
}));
const { audiometryFixture } = vi.hoisted(() => ({
  audiometryFixture: {
    id: 'au1',
    employeeId: 'p1',
    protocolId: 'pr1',
    performedAt: '2026-09-09T08:00:00.000Z',
    performedById: 'u1',
    deviceName: 'AD226',
    isBaseline: false,
    quietHours: 14,
    airRight: { '500': 10, '1000': 10, '2000': 15, '3000': 35, '4000': 50, '6000': 40, '8000': 25 },
    airLeft: { '500': 10, '1000': 10, '2000': 15, '3000': 15, '4000': 20, '6000': 20, '8000': 15 },
    boneRight: null,
    boneLeft: null,
    ptaRight: 21.3,
    ptaLeft: 13.8,
    notes: null,
    createdAt: '2026-09-09T08:00:00.000Z',
    updatedAt: '2026-09-09T08:00:00.000Z',
    employee: {
      id: 'p1',
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      nationalId: '10000000146',
      birthDate: '1990-01-15',
    },
    protocol: { id: 'pr1', protocolNumber: '2026-000001', type: 'PERIODIC', status: 'IN_PROGRESS' },
    performedBy: { id: 'u1', firstName: 'Demo', lastName: 'Admin' },
  },
}));
vi.mock('@/services/audiometry.service', () => ({
  audiometryService: {
    list: vi.fn().mockResolvedValue({
      items: [audiometryFixture],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    get: vi.fn().mockResolvedValue({
      ...audiometryFixture,
      analysis: {
        right: {
          pta: 21.3,
          grade: { key: 'NORMAL', label: 'Normal', max: 25 },
          noiseNotch: true,
          missing: [250],
        },
        left: {
          pta: 13.8,
          grade: { key: 'NORMAL', label: 'Normal', max: 25 },
          noiseNotch: false,
          missing: [250],
        },
        vsBaseline: {
          testId: 'au0',
          performedAt: '2025-09-09T08:00:00.000Z',
          right: { shiftDb: 23.3, sts: true },
          left: { shiftDb: 0, sts: false },
        },
        vsPrevious: null,
        flags: ['STS_BASELINE', 'NOISE_NOTCH'],
      },
    }),
    history: vi.fn().mockResolvedValue([
      {
        id: 'au0',
        performedAt: '2025-09-09T08:00:00.000Z',
        isBaseline: true,
        ptaRight: 12.5,
        ptaLeft: 13.8,
        protocol: null,
      },
      {
        id: 'au1',
        performedAt: '2026-09-09T08:00:00.000Z',
        isBaseline: false,
        ptaRight: 21.3,
        ptaLeft: 13.8,
        protocol: { id: 'pr1', protocolNumber: '2026-000001' },
      },
    ]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
const { ecgFixture } = vi.hoisted(() => ({
  ecgFixture: {
    id: 'ecg1',
    employeeId: 'p1',
    protocolId: 'pr1',
    performedAt: '2026-09-09T08:00:00.000Z',
    performedById: 'u1',
    deviceName: 'ECG-2150',
    heartRate: 104,
    rhythm: 'SINUS_TACHYCARDIA',
    prInterval: 160,
    qrsDuration: 92,
    qtInterval: 340,
    qtcInterval: null,
    axis: 45,
    findings: ['EARLY_REPOLARIZATION'],
    interpretation: 'BORDERLINE',
    comment: 'Kontrol önerildi.',
    documentId: null,
    createdAt: '2026-09-09T08:00:00.000Z',
    updatedAt: '2026-09-09T08:00:00.000Z',
    employee: {
      id: 'p1',
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      nationalId: '10000000146',
      birthDate: '1990-01-15',
      gender: 'FEMALE',
    },
    protocol: { id: 'pr1', protocolNumber: '2026-000001', type: 'PERIODIC', status: 'IN_PROGRESS' },
    performedBy: { id: 'u1', firstName: 'Demo', lastName: 'Admin' },
    document: null,
    analysis: { qtc: 448, qtcSource: 'bazett', flags: ['TACHYCARDIA'], suggested: 'BORDERLINE' },
  },
}));
vi.mock('@/services/ecg.service', () => ({
  ecgService: {
    list: vi.fn().mockResolvedValue({
      items: [ecgFixture],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    get: vi.fn().mockResolvedValue(ecgFixture),
    history: vi.fn().mockResolvedValue([
      {
        id: 'ecg1',
        performedAt: '2026-09-09T08:00:00.000Z',
        heartRate: 104,
        qtc: 448,
        interpretation: 'BORDERLINE',
        protocol: null,
        flags: ['TACHYCARDIA'],
      },
    ]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    attachTrace: vi.fn(),
    traceUrl: vi.fn(),
  },
}));
const { spirometryFixture } = vi.hoisted(() => ({
  spirometryFixture: {
    id: 'sp1',
    employeeId: 'p1',
    protocolId: 'pr1',
    performedAt: '2026-09-09T08:00:00.000Z',
    performedById: 'u1',
    deviceName: 'Spirolab',
    heightCm: 165,
    weightKg: 62,
    smokingStatus: 'NEVER',
    fvc: 3.2,
    fev1: 2.1,
    ratio: null,
    pef: 5.5,
    fef2575: null,
    fvcPredicted: null,
    fev1Predicted: null,
    postFvc: null,
    postFev1: 2.45,
    qualityGrade: 'A',
    isBaseline: false,
    pattern: null,
    comment: null,
    documentId: null,
    createdAt: '2026-09-09T08:00:00.000Z',
    updatedAt: '2026-09-09T08:00:00.000Z',
    employee: {
      id: 'p1',
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      nationalId: '10000000146',
      birthDate: '1990-01-15',
      gender: 'FEMALE',
    },
    protocol: { id: 'pr1', protocolNumber: '2026-000001', type: 'PERIODIC', status: 'IN_PROGRESS' },
    performedBy: { id: 'u1', firstName: 'Demo', lastName: 'Admin' },
    document: null,
    analysis: {
      ratio: 65.6,
      ratioSource: 'derived',
      predicted: { fvc: 3.47, fev1: 3.01, ratio: 82.2, source: 'ecsc' },
      fvcPercent: 92,
      fev1Percent: 70,
      pattern: 'OBSTRUCTIVE',
      severity: { key: 'MILD', label: 'Hafif' },
      bronchodilator: { fev1GainMl: 350, fev1GainPercent: 16.7, positive: true },
      fev1DeclinePercent: null,
      flags: ['OBSTRUCTION', 'BD_RESPONSE'],
    },
    baseline: null,
  },
}));
vi.mock('@/services/spirometry.service', () => ({
  spirometryService: {
    list: vi.fn().mockResolvedValue({
      items: [spirometryFixture],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    get: vi.fn().mockResolvedValue(spirometryFixture),
    history: vi.fn().mockResolvedValue([
      {
        id: 'sp1',
        performedAt: '2026-09-09T08:00:00.000Z',
        isBaseline: false,
        fev1: 2.1,
        fvc: 3.2,
        fev1Percent: 70,
        fvcPercent: 92,
        ratio: 65.6,
        pattern: 'OBSTRUCTIVE',
        protocol: null,
      },
    ]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    attachTrace: vi.fn(),
    traceUrl: vi.fn(),
  },
}));
const { eyeFixture } = vi.hoisted(() => ({
  eyeFixture: {
    id: 'eye1',
    employeeId: 'p1',
    protocolId: 'pr1',
    performedAt: '2026-09-09T08:00:00.000Z',
    performedById: 'u1',
    usesGlasses: true,
    usesContactLenses: false,
    farRight: 0.3,
    farLeft: 0.4,
    farRightCorrected: 1,
    farLeftCorrected: 1,
    nearRight: 1,
    nearLeft: 1,
    ishiharaCorrect: 14,
    ishiharaTotal: 14,
    colorVision: 'NOT_TESTED',
    visualField: 'NORMAL',
    findings: null,
    recommendation: 'GLASSES',
    comment: null,
    createdAt: '2026-09-09T08:00:00.000Z',
    updatedAt: '2026-09-09T08:00:00.000Z',
    employee: {
      id: 'p1',
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      nationalId: '10000000146',
      birthDate: '1990-01-15',
    },
    protocol: { id: 'pr1', protocolNumber: '2026-000001', type: 'PERIODIC', status: 'IN_PROGRESS' },
    performedBy: { id: 'u1', firstName: 'Demo', lastName: 'Admin' },
    analysis: {
      bestRight: 1,
      bestLeft: 1,
      colorVision: 'NORMAL',
      colorVisionSource: 'plates',
      flags: ['GLASSES_NEEDED'],
      suggested: 'GLASSES',
    },
  },
}));
vi.mock('@/services/eye.service', () => ({
  eyeService: {
    list: vi.fn().mockResolvedValue({
      items: [eyeFixture],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    get: vi.fn().mockResolvedValue(eyeFixture),
    history: vi.fn().mockResolvedValue([
      {
        id: 'eye1',
        performedAt: '2026-09-09T08:00:00.000Z',
        bestRight: 1,
        bestLeft: 1,
        colorVision: 'NORMAL',
        recommendation: 'GLASSES',
        flags: ['GLASSES_NEEDED'],
        protocol: null,
      },
    ]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
const { pneumoFixture } = vi.hoisted(() => ({
  pneumoFixture: {
    id: 'pn1',
    employeeId: 'p1',
    protocolId: 'pr1',
    radiologyRequestId: null,
    readAt: '2026-09-09T08:00:00.000Z',
    readerId: 'u1',
    readerRole: 'A okuyucu',
    filmDate: '2026-09-08',
    filmQuality: 1,
    qualityComment: null,
    profusion: '1/1',
    shapePrimary: 'q',
    shapeSecondary: 'p',
    zones: ['RU', 'LU'],
    largeOpacity: '0',
    pleuralPlaques: false,
    plaqueCalcification: false,
    diffuseThickening: false,
    costophrenicObliteration: [],
    symbols: ['em'],
    result: 'POSITIVE',
    comment: null,
    createdAt: '2026-09-09T08:00:00.000Z',
    updatedAt: '2026-09-09T08:00:00.000Z',
    employee: {
      id: 'p1',
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      nationalId: '10000000146',
      birthDate: '1990-01-15',
    },
    protocol: { id: 'pr1', protocolNumber: '2026-000001', type: 'PERIODIC', status: 'IN_PROGRESS' },
    radiologyRequest: null,
    reader: { id: 'u1', firstName: 'Demo', lastName: 'Admin' },
    analysis: {
      category: 1,
      zoneCount: 2,
      pleuralAbnormality: false,
      alertSymbols: [],
      previousCategory: 0,
      flags: ['SMALL_OPACITIES', 'PROGRESSION'],
      suggested: 'POSITIVE',
    },
    previous: {
      id: 'pn0',
      readAt: '2025-09-09T08:00:00.000Z',
      filmDate: '2025-09-08',
      profusion: '0/0',
    },
  },
}));
vi.mock('@/services/pneumoconiosis.service', () => ({
  pneumoconiosisService: {
    list: vi.fn().mockResolvedValue({
      items: [pneumoFixture],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    get: vi.fn().mockResolvedValue(pneumoFixture),
    history: vi.fn().mockResolvedValue([
      {
        id: 'pn0',
        readAt: '2025-09-09T08:00:00.000Z',
        filmDate: '2025-09-08',
        profusion: '0/0',
        category: 0,
        largeOpacity: '0',
        result: 'NEGATIVE',
        readerRole: 'A okuyucu',
        reader: null,
        flags: [],
        protocol: null,
      },
      {
        id: 'pn1',
        readAt: '2026-09-09T08:00:00.000Z',
        filmDate: '2026-09-08',
        profusion: '1/1',
        category: 1,
        largeOpacity: '0',
        result: 'POSITIVE',
        readerRole: 'A okuyucu',
        reader: null,
        flags: ['SMALL_OPACITIES', 'PROGRESSION'],
        protocol: null,
      },
    ]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
const { reportFixture } = vi.hoisted(() => ({
  reportFixture: {
    id: 'ex1',
    employeeId: 'p1',
    protocolId: 'pr1',
    type: 'PERIODIC',
    status: 'IN_PROGRESS',
    scheduledAt: null,
    performedAt: '2026-09-09T08:00:00.000Z',
    physicianId: 'u1',
    physicianProfileId: null,
    findings: null,
    conclusion: null,
    fitnessDecision: 'PENDING',
    restrictions: null,
    approvedById: null,
    approvedAt: null,
    nextExaminationDue: null,
    reportDocumentId: null,
    createdAt: '2026-09-09T08:00:00.000Z',
    updatedAt: '2026-09-09T08:00:00.000Z',
    anamnesis: { complaints: 'Öksürük', exposures: ['DUST'] },
    systemsExam: { EYES: { status: 'ABNORMAL', note: 'Pterjium' } },
    measurements: { WEIGHT: { value: 80, note: null, recordedAt: '2026-09-09T08:00:00.000Z' } },
    blockers: ['MISSING_DECISION', 'MISSING_PHYSICIAN'],
    employee: {
      id: 'p1',
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      nationalId: '10000000146',
      birthDate: '1990-01-15',
      gender: 'FEMALE',
      hireDate: '2020-01-01',
      company: { id: 'c1', name: 'Örnek A.Ş.' },
      occupation: null,
    },
    protocol: {
      id: 'pr1',
      protocolNumber: '2026-000001',
      type: 'PERIODIC',
      status: 'IN_PROGRESS',
      items: [{ id: 'i1', type: 'HEALTH_REPORT', status: 'PENDING' }],
    },
    physicianProfile: null,
    approvedBy: null,
    reportDocument: null,
    tests: [
      {
        module: 'audiometry',
        id: 'au1',
        performedAt: '2026-09-09T08:00:00.000Z',
        title: 'Odyometri',
        lines: ['Sağ 13.8 dB (Normal)', 'Sol 13.8 dB (Normal)'],
        alert: false,
      },
    ],
  },
}));
vi.mock('@/services/health-reports.service', () => ({
  healthReportsService: {
    list: vi.fn().mockResolvedValue({
      items: [reportFixture],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    get: vi.fn().mockResolvedValue(reportFixture),
    openForProtocol: vi.fn(),
    patientSummary: vi.fn().mockResolvedValue({
      audiometry: { count: 0 },
      spirometry: { count: 0 },
      eye: { count: 0 },
      ecg: { count: 0 },
      pneumoconiosis: { count: 0 },
      radiology: { count: 0 },
      report: { count: 0 },
    }),
    update: vi.fn(),
    approve: vi.fn(),
    pdfUrl: vi.fn(),
  },
}));
vi.mock('@/services/tenants.service', () => ({
  tenantsService: {
    current: vi
      .fn()
      .mockResolvedValue({ id: 't-demo', name: 'Demo OSGB', slug: 'demo', status: 'ACTIVE' }),
  },
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return router;
}

describe('application skeleton', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    vi.mocked(authService.login).mockReset();
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    // Bootstrap reloads the principal; echo whatever signInAs put into the store (keeps limited-permission tests intact).
    vi.mocked(authService.me).mockImplementation(() =>
      Promise.resolve(useAuthStore.getState().user!),
    );
  });

  it('redirects unauthenticated visitors to /login', async () => {
    const router = renderAt('/doctor/radiology');
    expect(await screen.findByRole('heading', { name: 'Giriş Yap' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('logs in through the API and lands on the dashboard with the real principal', async () => {
    vi.mocked(authService.login).mockResolvedValue(loginResponse());
    const router = renderAt('/login');
    fireEvent.change(await screen.findByLabelText('E-posta'), {
      target: { value: 'admin@demo.local' },
    });
    fireEvent.change(screen.getByLabelText('Şifre'), { target: { value: 'Admin123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
    expect(authService.login).toHaveBeenCalledWith({
      email: 'admin@demo.local',
      password: 'Admin123!',
    });
    expect(useAuthStore.getState().accessToken).toBe('access-token');
    expect(screen.getAllByText('Demo Admin').length).toBeGreaterThan(0);
  });

  it('shows validation errors before calling the API', async () => {
    renderAt('/login');
    fireEvent.click(await screen.findByRole('button', { name: 'Giriş Yap' }));
    expect(await screen.findByText('Geçerli bir e-posta adresi girin')).toBeInTheDocument();
    expect(screen.getByText('Şifre zorunludur')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('lists patients from the API with masked national ids', async () => {
    signInAs();
    renderAt('/patient-registration/patients');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hasta Kayıt' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Ayşe Yılmaz')).toBeInTheDocument();
    expect(screen.getByText('100*****146')).toBeInTheDocument();
    expect(screen.getByText('532 123 45 67')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Yeni Hasta/ })).toHaveAttribute(
      'href',
      '/patient-registration/patients/new',
    );
  });

  it.each(
    NAV_LEAVES.filter(
      (leaf) =>
        ![
          '/patient-registration/patients',
          '/patient-registration/protocols',
          '/settings/companies',
          '/settings/staff',
          '/settings/organization',
          '/settings/doctors',
          '/settings/tests',
          '/settings/test-packages',
          '/settings/occupations',
          '/settings/bulk-patient-import',
          '/settings/bulk-company-import',
          '/settings/staff-movements',
          '/settings/active-users',
          '/settings/kvkk-permissions',
          '/patient-registration/document-signing',
          '/patient-registration/examination-comparison',
          '/doctor/radiology',
          '/doctor/audiometry',
          '/doctor/ecg',
          '/doctor/spirometry',
          '/doctor/eye',
          '/doctor/pneumoconiosis',
          '/doctor/health-reports',
        ].includes(leaf.path),
    ).map((leaf) => [leaf.path, leaf.label] as const),
  )('renders %s with its page header and active nav item', async (path, label) => {
    signInAs();
    renderAt(path);
    expect(await screen.findByRole('heading', { level: 1, name: label })).toBeInTheDocument();
    expect(screen.queryByText(/sonraki geliştirme fazında/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { current: 'page' }).map((el) => el.textContent)).toEqual([
      label,
    ]);
  });

  it('hides entries without permission and renders the forbidden page for their routes', async () => {
    signInAs(adminUser, [PERMISSIONS.EMPLOYEES_READ]);
    renderAt('/settings/organization');
    expect(await screen.findByText('Bu sayfaya erişim yetkiniz yok')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Ana navigasyon' });
    expect(nav).toHaveTextContent('Hasta Kayıt');
    expect(nav).not.toHaveTextContent('Genel Ayarlar');
    expect(nav).not.toHaveTextContent('Doktor Modülü');
  });

  it('collapses the sidebar to an icon rail and back', async () => {
    signInAs();
    renderAt('/doctor/ecg');
    await screen.findByRole('heading', { level: 1, name: 'EKG' });
    fireEvent.click(screen.getByRole('button', { name: 'Menüyü daralt' }));
    expect(screen.queryByRole('link', { name: 'EKG' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Doktor Modülü' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Menüyü genişlet' }));
    expect(await screen.findByRole('link', { name: 'EKG' })).toBeInTheDocument();
    setSidebarCollapsed(false);
  });

  it('lists protocols with their number, patient, progress and status', async () => {
    signInAs();
    renderAt('/patient-registration/protocols');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Protokol Listesi' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('2026-000001')).toBeInTheDocument();
    expect(screen.getByText('Ayşe Yılmaz')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getAllByText('Devam ediyor').length).toBeGreaterThanOrEqual(2); // filter chip + row badge
    expect(screen.getByRole('button', { name: /Yeni Protokol/ })).toBeInTheDocument();
  });

  it.each([
    ['/patient-registration/protocols', 'Protokol Listesi'],
    ['/patient-registration/protocols/pr1', 'Protokol 2026-000001'],
  ])(
    'lets a registration clerk access %s without medical read permission',
    async (path, heading) => {
      signInAs(adminUser, [
        PERMISSIONS.EMPLOYEES_READ,
        PERMISSIONS.PROTOCOLS_READ,
        PERMISSIONS.PROTOCOLS_UPDATE,
      ]);
      renderAt(path);
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.queryByText('Bu sayfaya erişim yetkiniz yok')).not.toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Ana navigasyon' })).not.toHaveTextContent(
        'Sağlık Raporları',
      );
    },
  );

  it('renders the protocol detail with its items and actions', async () => {
    signInAs();
    renderAt('/patient-registration/protocols/pr1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Protokol 2026-000001' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Lab. Tahlilleri')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Radyoloji tamamlandı' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Protokolü Kapat/ })).toBeInTheDocument();
  });

  it('lists companies and opens the company card with branches and workplaces', async () => {
    signInAs();
    renderAt('/settings/companies');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Firma Tanımları' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('Tehlikeli')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yeni Firma/ })).toBeInTheDocument();
  });

  it('renders the company card with branches and workplaces', async () => {
    signInAs();
    renderAt('/settings/companies/c1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Örnek A.Ş.' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Fabrika')).toBeInTheDocument();
    expect(screen.getAllByText('Merkez').length).toBeGreaterThanOrEqual(2); // branch row + workplace column
    expect(screen.getByRole('button', { name: 'Fabrika düzenle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /İşyeri Ekle/ })).toBeInTheDocument();
  });

  it('shows staff with their roles and the role tab with system roles', async () => {
    signInAs();
    renderAt('/settings/staff');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Personel Tanımları' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('admin@demo.local')).toBeInTheDocument();
    expect(screen.getByText('Kurum Yöneticisi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Demo Admin şifre sıfırla' })).toBeInTheDocument();
    // Radix tabs activate on mousedown, not click.
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Roller ve Yetkiler' }));
    // The sidebar footer also shows the signed-in user's role key; the description is unique to the table.
    expect(await screen.findByText('Full access')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yeni Rol/ })).toBeInTheDocument();
  });

  it('renders the organization profile form with the stored values', async () => {
    signInAs();
    renderAt('/settings/organization');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kurum Bilgileri' }),
    ).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Demo OSGB Ltd. Şti.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('01.03.2024')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Logo Yükle/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeDisabled();
  });

  it('lists physicians with their credentials and signature state', async () => {
    signInAs();
    renderAt('/settings/doctors');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Doktor Tanımları' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Uzm. Dr. Ayşe Demir')).toBeInTheDocument();
    expect(screen.getByText('IH-2020-7')).toBeInTheDocument();
    expect(screen.getByText('Yüklü')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uzm. Dr. Ayşe Demir imza' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yeni Doktor/ })).toBeInTheDocument();
  });

  it('lists test definitions with net and gross prices', async () => {
    signInAs();
    renderAt('/settings/tests');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tetkik Tanımları' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('LAB-HGB')).toBeInTheDocument();
    expect(screen.getByText('Kan · 12-16 g/dL')).toBeInTheDocument();
    expect(screen.getByText(/165,55/)).toBeInTheDocument(); // 150.50 + %10
    expect(screen.getByRole('button', { name: /Yeni Tetkik/ })).toBeInTheDocument();
  });

  it('lists test packages with totals and category badges', async () => {
    signInAs();
    renderAt('/settings/test-packages');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tetkik Paketleri' }),
    ).toBeInTheDocument();
    // The mocked list resolves before the session bootstrap re-mounts the shell, so a node found
    // once can be replaced a tick later; waitFor re-queries until the final tree is stable.
    await waitFor(() => {
      expect(screen.getByText('PKT-ISE-GIRIS')).toBeInTheDocument();
      expect(screen.getByText('2 tetkik')).toBeInTheDocument();
      expect(screen.getByText(/990,00/)).toBeInTheDocument();
      expect(screen.getByText(/−.*100,50/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Yeni Paket/ })).toBeInTheDocument();
  });

  it('lists occupations with patient counts and the default-import action', async () => {
    signInAs();
    renderAt('/settings/occupations');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Meslek Tanımları' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Kaynakçı')).toBeInTheDocument();
      expect(screen.getByText('7212')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Varsayılan Listeyi Yükle/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yeni Meslek/ })).toBeInTheDocument();
  });

  it('renders the bulk patient import page with template download and drop zone', async () => {
    signInAs();
    renderAt('/settings/bulk-patient-import');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Toplu Hasta Aktarma' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Şablonu İndir/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Aktarma dosyası seç')).toHaveAttribute(
      'accept',
      '.xlsx,.xls,.csv',
    );
  });

  it('renders the bulk company import page with template download and drop zone', async () => {
    signInAs();
    renderAt('/settings/bulk-company-import');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Toplu Firma Aktarma' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Şablonu İndir/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Aktarma dosyası seç')).toHaveAttribute(
      'accept',
      '.xlsx,.xls,.csv',
    );
  });

  it('shows staff activity as sentences with categories and the user summary', async () => {
    signInAs();
    renderAt('/settings/staff-movements');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Personel Hareketleri' }),
    ).toBeInTheDocument();
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Ayşe Yılmaz hastasını kaydetti')).toBeInTheDocument();
      expect(within(table).getByText('başarısız giriş denemesi')).toBeInTheDocument();
      expect(within(table).getByText('Hasta kayıt')).toBeInTheDocument();
    });
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Kullanıcı özeti' }));
    expect(await screen.findByText('admin@demo.local')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Hareketler' }));
    const rows = await screen.findByRole('table');
    fireEvent.click(within(rows).getByText('Ayşe Yılmaz hastasını kaydetti').closest('tr')!);
    expect(await screen.findByText('Yeni değer')).toBeInTheDocument();
  });

  it('lists active sessions grouped by user with device labels and sign-out actions', async () => {
    signInAs();
    renderAt('/settings/active-users');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Aktif Kullanıcılar' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Chrome · Windows')).toBeInTheDocument();
      expect(screen.getByText('Safari · iOS')).toBeInTheDocument();
    });
    expect(screen.getByText('Bu oturum')).toBeInTheDocument();
    expect(screen.getByText('↳ aynı kullanıcı')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Demo Admin tüm oturumlarını kapat' }),
    ).toBeInTheDocument();
  });

  it('lists KVKK consents and the consent text versions', async () => {
    signInAs();
    renderAt('/settings/kvkk-permissions');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'KVKK İzinleri' }),
    ).toBeInTheDocument();
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Ayşe Yılmaz')).toBeInTheDocument();
      expect(within(table).getByText('Tablet / imza pedi')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Rıza Kaydet/ })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Rıza Metinleri' }));
    expect(await screen.findByText('Yürürlükte')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Varsayılan metinleri yükle/ })).toBeInTheDocument();
  });

  it('lists signed documents on the Belge İmza page', async () => {
    signInAs();
    renderAt('/patient-registration/document-signing');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Belge İmza' }),
    ).toBeInTheDocument();
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Aydınlatma Metni (v2)')).toBeInTheDocument();
      expect(within(table).getAllByText('Ayşe Yılmaz').length).toBeGreaterThan(0);
    });
    expect(
      screen.getByRole('button', { name: /Aydınlatma Metni \(v2\) indir/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Belge veya hasta ara')).toBeInTheDocument();
  });

  it("compares a patient's examinations side by side", async () => {
    signInAs();
    renderAt('/patient-registration/examination-comparison?patientId=p1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Muayene Karşılaştırma' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('82,5 kg')).toBeInTheDocument();
    expect(screen.getByText('(+2,5)')).toBeInTheDocument();
    expect(screen.getByText('yüksek')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /ölçümlerini düzenle/ })).toBeInTheDocument();
  });

  it('lists radiology requests and unlinked PACS studies', async () => {
    signInAs();
    renderAt('/doctor/radiology');
    expect(await screen.findByRole('heading', { level: 1, name: 'Radyoloji' })).toBeInTheDocument();
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Ayşe Yılmaz')).toBeInTheDocument();
      expect(within(table).getByText('Görüntü alındı')).toBeInTheDocument();
    });
    expect(await screen.findByText('LOMBER')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Eşleşen isteği aç/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yeni İstek/ })).toBeInTheDocument();
  });

  it('shows a radiology request with its PACS study and report editor', async () => {
    signInAs();
    renderAt('/doctor/radiology/rr1');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Ayşe Yılmaz · CR Akciğer PA/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText('CHEST')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Görüntüleyicide Aç' })).toBeInTheDocument();
    expect(screen.getByLabelText('Rapor metni')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Raporu Kaydet/ })).toBeDisabled();
  });

  it('lists audiometry tests with hearing grades', async () => {
    signInAs();
    renderAt('/doctor/audiometry');
    expect(await screen.findByRole('heading', { level: 1, name: 'Odyometri' })).toBeInTheDocument();
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Ayşe Yılmaz')).toBeInTheDocument();
      expect(within(table).getByText('21,3 dB')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Yeni Test/ })).toHaveAttribute(
      'href',
      '/doctor/audiometry/new',
    );
  });

  it('shows an audiometry test with audiogram, analysis flags and history', async () => {
    signInAs();
    renderAt('/doctor/audiometry/au1');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Ayşe Yılmaz · / }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Odyogram' })).toBeInTheDocument();
    expect(await screen.findByText('Eşik kayması (başlangıca göre)')).toBeInTheDocument();
    expect(screen.getAllByText('Gürültü çentiği').length).toBeGreaterThan(1);
    expect(await screen.findByText(/\(bu test\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Düzenle/ })).toBeInTheDocument();
  });

  it('opens the new audiometry test form', async () => {
    signInAs();
    renderAt('/doctor/audiometry/new');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Yeni odyometri testi' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Sağ hava 4000 Hz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Testi Kaydet' })).toBeDisabled();
  });

  it('lists ECG records with interpretation and flags', async () => {
    signInAs();
    renderAt('/doctor/ecg');
    expect(await screen.findByRole('heading', { level: 1, name: 'EKG' })).toBeInTheDocument();
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Ayşe Yılmaz')).toBeInTheDocument();
      expect(within(table).getByText('104 /dk')).toBeInTheDocument();
      expect(within(table).getByText('1 uyarı')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Yeni Kayıt/ })).toHaveAttribute(
      'href',
      '/doctor/ecg/new',
    );
  });

  it('shows an ECG record with derived QTc and the printout section', async () => {
    signInAs();
    renderAt('/doctor/ecg/ecg1');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Ayşe Yılmaz · / }),
    ).toBeInTheDocument();
    expect(await screen.findByText('448 ms')).toBeInTheDocument();
    expect(screen.getByText('Taşikardi (> 100/dk)')).toBeInTheDocument();
    expect(screen.getByText('Erken repolarizasyon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Çıktı ekle/ })).toBeInTheDocument();
  });

  it('opens the new ECG form with the automatic suggestion', async () => {
    signInAs();
    renderAt('/doctor/ecg/new');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Yeni EKG kaydı' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Kalp hızı (/dk)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kaydı Oluştur' })).toBeDisabled();
  });

  it('lists spirometry tests with percent predicted and pattern', async () => {
    signInAs();
    renderAt('/doctor/spirometry');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Spirometri' }),
    ).toBeInTheDocument();
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Ayşe Yılmaz')).toBeInTheDocument();
      expect(within(table).getByText('%70 beklenen')).toBeInTheDocument();
      expect(within(table).getByText('Obstrüktif')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Yeni Test/ })).toHaveAttribute(
      'href',
      '/doctor/spirometry/new',
    );
  });

  it('shows a spirometry test with flags and bronchodilator response', async () => {
    signInAs();
    renderAt('/doctor/spirometry/sp1');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Ayşe Yılmaz · / }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Obstrüksiyon (FEV1/FVC < %70)')).toBeInTheDocument();
    expect(
      screen.getByText('Bronkodilatör yanıtı pozitif (≥ %12 ve ≥ 200 mL)'),
    ).toBeInTheDocument();
    expect(screen.getByText('+350 mL · +%16.7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Çıktı ekle/ })).toBeInTheDocument();
  });

  it('opens the new spirometry form', async () => {
    signInAs();
    renderAt('/doctor/spirometry/new');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Yeni spirometri testi' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('FVC (L)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Testi Kaydet' })).toBeDisabled();
  });

  it('lists eye examinations with best acuity and recommendation', async () => {
    signInAs();
    renderAt('/doctor/eye');
    expect(await screen.findByRole('heading', { level: 1, name: 'Göz' })).toBeInTheDocument();
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Ayşe Yılmaz')).toBeInTheDocument();
      expect(within(table).getAllByText('1,0 (6/6)').length).toBe(2);
      expect(within(table).getByText('Gözlük önerisi')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Yeni Muayene/ })).toHaveAttribute(
      'href',
      '/doctor/eye/new',
    );
  });

  it('shows an eye examination with flags and Ishihara result', async () => {
    signInAs();
    renderAt('/doctor/eye/eye1');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Ayşe Yılmaz · / }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/gözlük gerekli/)).toBeInTheDocument();
    expect(screen.getByText('(İshihara 14/14)')).toBeInTheDocument();
    expect(screen.getByText('Uzak (düzeltmeli)')).toBeInTheDocument();
  });

  it('opens the new eye examination form', async () => {
    signInAs();
    renderAt('/doctor/eye/new');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Yeni göz muayenesi' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Uzak sağ (düzeltmesiz)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Muayeneyi Kaydet' })).toBeDisabled();
  });

  it('lists ILO readings with profusion and result', async () => {
    signInAs();
    renderAt('/doctor/pneumoconiosis');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pnömokonyoz' }),
    ).toBeInTheDocument();
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Ayşe Yılmaz')).toBeInTheDocument();
      expect(within(table).getByText('1/1')).toBeInTheDocument();
      expect(within(table).getByText('Pozitif')).toBeInTheDocument();
      expect(within(table).getByText('2 uyarı')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Yeni Okuma/ })).toHaveAttribute(
      'href',
      '/doctor/pneumoconiosis/new',
    );
  });

  it('shows an ILO reading with progression against the previous film', async () => {
    signInAs();
    renderAt('/doctor/pneumoconiosis/pn1');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Ayşe Yılmaz · / }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/kategori artışı/)).toBeInTheDocument();
    expect(screen.getByText(/kategori 0 → 1/)).toBeInTheDocument();
    expect(screen.getByText('Sağ üst, Sol üst')).toBeInTheDocument();
    expect(screen.getByText('em · Amfizem')).toBeInTheDocument();
  });

  it('opens the new ILO reading form', async () => {
    signInAs();
    renderAt('/doctor/pneumoconiosis/new');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Yeni ILO okuması' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Tutulan zonlar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Okumayı Kaydet' })).toBeDisabled();
  });

  it('lists health reports with status and decision', async () => {
    signInAs();
    renderAt('/doctor/health-reports');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sağlık Raporları' }),
    ).toBeInTheDocument();
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Ayşe Yılmaz')).toBeInTheDocument();
      expect(within(table).getByText('Karar bekliyor')).toBeInTheDocument();
      expect(within(table).getByText('2026-000001')).toBeInTheDocument();
    });
  });

  it('opens the report editor with blockers, sections and test summaries', async () => {
    signInAs();
    renderAt('/doctor/health-reports/ex1');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Ayşe Yılmaz · Periyodik/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Çalışabilirlik kararı verilmemiş')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Öksürük')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pterjium')).toBeInTheDocument();
    expect(screen.getByText('Sağ 13.8 dB (Normal) · Sol 13.8 dB (Normal)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Onayla ve PDF Oluştur/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Raporu Kaydet' })).toBeInTheDocument();
  });

  it('unknown routes render the not-found page', async () => {
    renderAt('/does-not-exist');
    expect(await screen.findByText('Sayfa bulunamadı')).toBeInTheDocument();
  });
});
