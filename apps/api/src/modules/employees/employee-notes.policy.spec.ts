import { PERMISSIONS } from '@osgb/shared-types';
import type { AuthenticatedUser } from '@/common/interfaces';
import {
  assertCanWriteEmployeeNotes,
  canAccessEmployeeNotes,
  employeeVisibleTo,
} from './employee-notes.policy';

function actor(permissions: AuthenticatedUser['permissions']): AuthenticatedUser {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'user@example.test',
    firstName: 'Test',
    lastName: 'User',
    status: 'ACTIVE',
    roles: [],
    permissions,
  };
}

describe('employee notes policy', () => {
  const employee = { id: 'employee-1', firstName: 'Ada', notes: 'clinical free text' };

  it('hides free-text notes from non-medical staff', () => {
    const receptionist = actor([PERMISSIONS.EMPLOYEES_READ]);
    expect(canAccessEmployeeNotes(receptionist)).toBe(false);
    expect(employeeVisibleTo(receptionist, employee)).toEqual({
      id: 'employee-1',
      firstName: 'Ada',
    });
    expect(() => assertCanWriteEmployeeNotes(receptionist, 'text')).toThrow(
      'Medical permission is required',
    );
  });

  it('allows medical staff to read and write notes', () => {
    const physician = actor([PERMISSIONS.EXAMINATIONS_READ]);
    expect(canAccessEmployeeNotes(physician)).toBe(true);
    expect(employeeVisibleTo(physician, employee)).toBe(employee);
    expect(() => assertCanWriteEmployeeNotes(physician, 'text')).not.toThrow();
  });
});
