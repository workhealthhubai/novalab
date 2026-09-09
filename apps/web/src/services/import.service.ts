import type { ImportPreview, ImportResult, ImportService } from '@/types/import';
import { apiClient, unwrap } from './api-client';

function formData(file: File): FormData {
  const form = new FormData();
  form.append('file', file, file.name);
  return form;
}

/** Builds an ImportService for `/employee-imports`, `/company-imports`, … */
export function createImportService(basePath: string): ImportService {
  return {
    async template(): Promise<Blob> {
      const response = await apiClient.get<Blob>(`${basePath}/template`, { responseType: 'blob' });
      return response.data;
    },
    async preview(file: File): Promise<ImportPreview> {
      return unwrap(
        await apiClient.post(`${basePath}/preview`, formData(file), { timeout: 120_000 }),
      );
    },
    async import(file: File): Promise<ImportResult> {
      return unwrap(await apiClient.post(basePath, formData(file), { timeout: 300_000 }));
    },
  };
}

export const patientImportService = createImportService('/employee-imports');
export const companyImportService = createImportService('/company-imports');
