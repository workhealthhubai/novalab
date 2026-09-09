import type { PhysicianStatus, UserStatus } from '@osgb/shared-types';

export interface PhysicianUserRef {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
}

export interface Physician {
  id: string;
  userId: string | null;
  title: string | null;
  firstName: string;
  lastName: string;
  specialty: string | null;
  diplomaNumber: string | null;
  diplomaRegistrationNumber: string | null;
  certificateNumber: string | null;
  phone: string | null;
  email: string | null;
  signatureUpdatedAt: string | null;
  status: PhysicianStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: PhysicianUserRef | null;
}

/** Create/update payload; empty strings clear a field, `userId: null` unlinks. */
export interface PhysicianInput {
  firstName: string;
  lastName: string;
  title?: string;
  specialty?: string;
  diplomaNumber?: string;
  diplomaRegistrationNumber?: string;
  certificateNumber?: string;
  phone?: string;
  email?: string;
  userId?: string | null;
  status?: PhysicianStatus;
  notes?: string;
}

export interface PhysicianListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: PhysicianStatus;
}
