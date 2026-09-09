import type {
  ExaminationComparison,
  MeasurementInput,
  MeasurementValue,
  TimelineExamination,
} from '@/types/examination';
import { apiClient, unwrap } from './api-client';

export const examinationsService = {
  async timeline(employeeId: string): Promise<TimelineExamination[]> {
    return unwrap(await apiClient.get('/examinations/timeline', { params: { employeeId } }));
  },
  async compare(employeeId: string, ids?: string[]): Promise<ExaminationComparison> {
    return unwrap(
      await apiClient.get('/examinations/compare', {
        params: { employeeId, ...(ids?.length ? { ids: ids.join(',') } : {}) },
      }),
    );
  },
  async setMeasurements(
    id: string,
    measurements: MeasurementInput[],
  ): Promise<{ examinationId: string; measurements: Record<string, MeasurementValue> }> {
    return unwrap(await apiClient.put(`/examinations/${id}/measurements`, { measurements }));
  },
};
