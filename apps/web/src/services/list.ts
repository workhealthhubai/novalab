import type { AxiosResponse } from 'axios';
import type { PaginatedResult, PaginationMeta } from '@osgb/shared-types';

interface ListEnvelope<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

/** Turns the `{ data, meta }` list envelope into a PaginatedResult. */
export function toPaginated<T>(response: AxiosResponse<ListEnvelope<T>>): PaginatedResult<T> {
  return { items: response.data.data, meta: response.data.meta };
}
