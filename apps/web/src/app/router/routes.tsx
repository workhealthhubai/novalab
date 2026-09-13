import { WorkItemsPage } from '@/pages/work-items-page';
import { DocumentTrackingPage } from '@/pages/document-tracking-page';
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/password-recovery-pages';
import { Navigate, type RouteObject } from 'react-router';
import { AppLayout } from '@/layouts/app-layout';
import { AuthLayout } from '@/layouts/auth-layout';
import { DashboardPage } from '@/pages/dashboard-page';
import { AudiometryNewPage } from '@/pages/doctor/audiometry-new-page';
import { AudiometryPage } from '@/pages/doctor/audiometry-page';
import { AudiometryTestPage } from '@/pages/doctor/audiometry-test-page';
import { ESignaturePage } from '@/pages/doctor/e-signature-page';
import { EcgNewPage } from '@/pages/doctor/ecg-new-page';
import { EcgPage } from '@/pages/doctor/ecg-page';
import { EcgRecordPage } from '@/pages/doctor/ecg-record-page';
import { EyeExaminationPage } from '@/pages/doctor/eye-examination-page';
import { EyeNewPage } from '@/pages/doctor/eye-new-page';
import { EyePage } from '@/pages/doctor/eye-page';
import { HealthReportPage } from '@/pages/doctor/health-report-page';
import { HealthReportsPage } from '@/pages/doctor/health-reports-page';
import { IsgReportsPage } from '@/pages/doctor/isg-reports-page';
import { LabResultsPage } from '@/pages/doctor/lab-results-page';
import { PneumoconiosisNewPage } from '@/pages/doctor/pneumoconiosis-new-page';
import { PneumoconiosisPage } from '@/pages/doctor/pneumoconiosis-page';
import { PneumoconiosisReadingPage } from '@/pages/doctor/pneumoconiosis-reading-page';
import { RadiologyPage } from '@/pages/doctor/radiology-page';
import { RadiologyRequestPage } from '@/pages/doctor/radiology-request-page';
import { ReportTemplatesPage } from '@/pages/doctor/report-templates-page';
import { SpirometryNewPage } from '@/pages/doctor/spirometry-new-page';
import { SpirometryPage } from '@/pages/doctor/spirometry-page';
import { SpirometryTestPage } from '@/pages/doctor/spirometry-test-page';
import { LoginPage } from '@/pages/login-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { DocumentSigningPage } from '@/pages/patient-registration/document-signing-page';
import { ExaminationComparisonPage } from '@/pages/patient-registration/examination-comparison-page';
import { PatientDetailPage } from '@/pages/patient-registration/patient-detail-page';
import { PatientFormPage } from '@/pages/patient-registration/patient-form-page';
import { PatientsPage } from '@/pages/patient-registration/patients-page';
import { ProtocolDetailPage } from '@/pages/patient-registration/protocol-detail-page';
import { ProtocolsPage } from '@/pages/patient-registration/protocols-page';
import { AccountingPage } from '@/pages/settings/accounting-page';
import { ActiveUsersPage } from '@/pages/settings/active-users-page';
import { BulkCompanyImportPage } from '@/pages/settings/bulk-company-import-page';
import { BulkPatientImportPage } from '@/pages/settings/bulk-patient-import-page';
import { CompaniesPage } from '@/pages/settings/companies-page';
import { CompanyDetailPage } from '@/pages/settings/company-detail-page';
import { DicomRecordsPage } from '@/pages/settings/dicom-records-page';
import { DoctorPayoutsPage } from '@/pages/settings/doctor-payouts-page';
import { DoctorsPage } from '@/pages/settings/doctors-page';
import { KvkkPermissionsPage } from '@/pages/settings/kvkk-permissions-page';
import { OccupationsPage } from '@/pages/settings/occupations-page';
import { OrganizationPage } from '@/pages/settings/organization-page';
import { StaffMovementsPage } from '@/pages/settings/staff-movements-page';
import { StaffPage } from '@/pages/settings/staff-page';
import { SubOsgbPage } from '@/pages/settings/sub-osgb-page';
import { TenantsPage } from '@/pages/settings/tenants-page';
import { TestPackagesPage } from '@/pages/settings/test-packages-page';
import { TestsPage } from '@/pages/settings/tests-page';
import { PATHS } from './navigation';

import { PermissionGate } from './permission-gate';

/** Permission-gated application routes. */
export const routes: RouteObject[] = [
  {
    element: <AuthLayout allowAuthenticated />,
    children: [{ path: '/reset-password', element: <ResetPasswordPage /> }],
  },
  { path: '/', element: <Navigate to={PATHS.dashboard} replace /> },
  {
    element: <AuthLayout />,
    children: [
      { path: PATHS.login, element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      {
        element: <PermissionGate />,
        children: [
          { path: PATHS.dashboard, element: <DashboardPage /> },
          { path: PATHS.workItems, element: <WorkItemsPage /> },
          { path: PATHS.documentTracking, element: <DocumentTrackingPage /> },
          { path: PATHS.patients, element: <PatientsPage /> },
          { path: PATHS.patientNew, element: <PatientFormPage /> },
          { path: PATHS.patientDetail, element: <PatientDetailPage /> },
          { path: PATHS.patientEdit, element: <PatientFormPage /> },
          { path: PATHS.protocols, element: <ProtocolsPage /> },
          { path: PATHS.protocolDetail, element: <ProtocolDetailPage /> },
          { path: PATHS.documentSigning, element: <DocumentSigningPage /> },
          { path: PATHS.examinationComparison, element: <ExaminationComparisonPage /> },
          { path: PATHS.radiology, element: <RadiologyPage /> },
          { path: PATHS.radiologyStudy, element: <RadiologyRequestPage /> },
          { path: PATHS.audiometry, element: <AudiometryPage /> },
          { path: PATHS.audiometryNew, element: <AudiometryNewPage /> },
          { path: PATHS.audiometryTest, element: <AudiometryTestPage /> },
          { path: PATHS.ecg, element: <EcgPage /> },
          { path: PATHS.ecgNew, element: <EcgNewPage /> },
          { path: PATHS.ecgRecord, element: <EcgRecordPage /> },
          { path: PATHS.spirometry, element: <SpirometryPage /> },
          { path: PATHS.spirometryNew, element: <SpirometryNewPage /> },
          { path: PATHS.spirometryTest, element: <SpirometryTestPage /> },
          { path: PATHS.eye, element: <EyePage /> },
          { path: PATHS.eyeNew, element: <EyeNewPage /> },
          { path: PATHS.eyeExamination, element: <EyeExaminationPage /> },
          { path: PATHS.pneumoconiosis, element: <PneumoconiosisPage /> },
          { path: PATHS.pneumoconiosisNew, element: <PneumoconiosisNewPage /> },
          { path: PATHS.pneumoconiosisReading, element: <PneumoconiosisReadingPage /> },
          { path: PATHS.healthReports, element: <HealthReportsPage /> },
          { path: PATHS.healthReport, element: <HealthReportPage /> },
          { path: PATHS.isgReports, element: <IsgReportsPage /> },
          { path: PATHS.labResults, element: <LabResultsPage /> },
          { path: PATHS.reportTemplates, element: <ReportTemplatesPage /> },
          { path: PATHS.eSignature, element: <ESignaturePage /> },
          { path: PATHS.organization, element: <OrganizationPage /> },
          { path: PATHS.companies, element: <CompaniesPage /> },
          { path: PATHS.companyDetail, element: <CompanyDetailPage /> },
          { path: PATHS.doctors, element: <DoctorsPage /> },
          { path: PATHS.doctorPayouts, element: <DoctorPayoutsPage /> },
          { path: PATHS.tests, element: <TestsPage /> },
          { path: PATHS.testPackages, element: <TestPackagesPage /> },
          { path: PATHS.occupations, element: <OccupationsPage /> },
          { path: PATHS.bulkPatientImport, element: <BulkPatientImportPage /> },
          { path: PATHS.bulkCompanyImport, element: <BulkCompanyImportPage /> },
          { path: PATHS.staff, element: <StaffPage /> },
          { path: PATHS.staffMovements, element: <StaffMovementsPage /> },
          { path: PATHS.activeUsers, element: <ActiveUsersPage /> },
          { path: PATHS.kvkkPermissions, element: <KvkkPermissionsPage /> },
          { path: PATHS.accounting, element: <AccountingPage /> },
          { path: PATHS.dicomRecords, element: <DicomRecordsPage /> },
          { path: PATHS.subOsgb, element: <SubOsgbPage /> },
          { path: PATHS.tenants, element: <TenantsPage /> },
        ],
      },

    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
