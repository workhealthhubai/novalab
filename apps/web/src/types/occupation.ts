export interface Occupation {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { employees: number };
}

export interface OccupationInput {
  name: string;
  code?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface OccupationListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}
