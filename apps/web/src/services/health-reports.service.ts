import type { PaginatedResult } from '@osgb/shared-types';
import type {
  HealthReport,
  HealthReportDetail,
  HealthReportListQuery,
  HealthReportUpdateInput,
  PatientMedicalSummary,
} from '@/types/health-report';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const healthReportsService = {
  async list(query: HealthReportListQuery = {}): Promise<PaginatedResult<HealthReport>> {
    return toPaginated(await apiClient.get('/health-reports', { params: query }));
  },
  async get(id: string): Promise<HealthReportDetail> {
    return unwrap(await apiClient.get(`/health-reports/${id}`));
  },
  async patientSummary(employeeId: string): Promise<PatientMedicalSummary> {
    return unwrap(await apiClient.get(`/health-reports/patients/${employeeId}/summary`));
  },
  async openForProtocol(protocolId: string): Promise<HealthReportDetail> {
    return unwrap(await apiClient.post('/health-reports', { protocolId }));
  },
  async update(id: string, input: HealthReportUpdateInput): Promise<HealthReportDetail> {
    return unwrap(await apiClient.patch(`/health-reports/${id}`, input));
  },
  async approve(id: string): Promise<HealthReportDetail> {
    return unwrap(await apiClient.post(`/health-reports/${id}/approve`));
  },
  async pdfUrl(id: string): Promise<{ url: string; expiresIn: number }> {
    return unwrap(await apiClient.get(`/health-reports/${id}/pdf-url`));
  },
};
