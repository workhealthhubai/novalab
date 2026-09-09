import { describe, expect, it } from 'vitest';
import { newUserSchema, roleSchema, setPasswordSchema } from './user-schemas';

describe('user schemas', () => {
  it('enforces the API password rule (10+ chars, letters and digits)', () => {
    const base = { firstName: 'Ayşe', lastName: 'Yılmaz', email: 'ayse@example.com', roleIds: [] };
    expect(newUserSchema.safeParse({ ...base, password: 'short1' }).success).toBe(false);
    expect(newUserSchema.safeParse({ ...base, password: 'onlyletterslong' }).success).toBe(false);
    expect(newUserSchema.safeParse({ ...base, password: 'Gecici12345' }).success).toBe(true);
  });

  it('requires matching confirmation when resetting a password', () => {
    const result = setPasswordSchema.safeParse({ password: 'Gecici12345', confirm: 'Gecici12346' });
    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((i) => i.path.join('.'))).toContain(
      'confirm',
    );
  });

  it('keeps role names snake_case for the API', () => {
    expect(roleSchema.safeParse({ name: 'ik_uzmani', description: '' }).success).toBe(true);
    expect(roleSchema.safeParse({ name: 'İK Uzmanı', description: '' }).success).toBe(false);
  });
});
