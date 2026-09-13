import { safeRequestPath } from './safe-request-path';

describe('safeRequestPath', () => {
  it('removes query strings and fragments that may contain patient search data', () => {
    expect(safeRequestPath('/api/patients?search=10000000146')).toBe('/api/patients');
    expect(safeRequestPath('/api/reports#patient-name')).toBe('/api/reports');
  });

  it('preserves route paths without query data', () => {
    expect(safeRequestPath('/api/examinations/:id')).toBe('/api/examinations/:id');
    expect(safeRequestPath(undefined)).toBe('');
  });
});
