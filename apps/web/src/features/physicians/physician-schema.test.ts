import { describe, expect, it } from 'vitest';
import { emptyPhysicianForm, physicianSchema, toPhysicianInput } from './physician-schema';

describe('physician schema', () => {
  it('requires first and last name and validates e-mail when given', () => {
    expect(physicianSchema.safeParse(emptyPhysicianForm).success).toBe(false);
    const filled = { ...emptyPhysicianForm, firstName: 'Ayşe', lastName: 'Demir' };
    expect(physicianSchema.safeParse(filled).success).toBe(true);
    expect(physicianSchema.safeParse({ ...filled, email: 'nope' }).success).toBe(false);
  });

  it('sends an empty user selection as null so the API unlinks the account', () => {
    const input = toPhysicianInput({ ...emptyPhysicianForm, firstName: 'Ayşe', lastName: 'Demir' });
    expect(input.userId).toBeNull();
    expect(input.title).toBe('Dr.');
  });
});
