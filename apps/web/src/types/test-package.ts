import type { TestCategory } from '@osgb/shared-types';

export interface TestPackageItem {
  id: string;
  testId: string;
  quantity: number;
  orderIndex: number;
  test: {
    id: string;
    code: string;
    name: string;
    category: TestCategory;
    unitPrice: string | number;
    vatRate: number;
    isActive: boolean;
  };
}

export interface TestPackage {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: string | number | null;
  vatRate: number;
  isActive: boolean;
  sortOrder: number;
  items: TestPackageItem[];
  totals: { net: number; gross: number; itemsNet: number; discount: number };
  createdAt: string;
  updatedAt: string;
}

export interface TestPackageInput {
  code: string;
  name: string;
  description?: string | null;
  price?: number | null;
  vatRate?: number;
  isActive?: boolean;
  sortOrder?: number;
  items: Array<{ testId: string; quantity?: number }>;
}

export interface TestPackageListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}
