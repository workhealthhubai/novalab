import type { TestCategory } from '@osgb/shared-types';

export interface TestDefinition {
  id: string;
  code: string;
  name: string;
  category: TestCategory;
  /** Decimal serialised as string by the API. */
  unitPrice: string;
  vatRate: number;
  durationMinutes: number | null;
  sampleType: string | null;
  referenceRange: string | null;
  unit: string | null;
  isActive: boolean;
  sortOrder: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestDefinitionInput {
  code: string;
  name: string;
  category: TestCategory;
  unitPrice?: number;
  vatRate?: number;
  durationMinutes?: number | null;
  sampleType?: string | null;
  referenceRange?: string | null;
  unit?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  notes?: string | null;
}

export interface TestListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: TestCategory;
  isActive?: boolean;
}
