import { describe, expect, it } from 'vitest';
import { emptyOccupationForm, occupationSchema, toOccupationInput } from './occupation-schema';

describe('occupation schema', () => {
  it('requires a name and validates the optional code', () => {
    expect(occupationSchema.safeParse(emptyOccupationForm).success).toBe(false);
    expect(
      occupationSchema.safeParse({ ...emptyOccupationForm, name: 'Kaynakçı', code: '72 12' })
        .success,
    ).toBe(false);
    const parsed = occupationSchema.parse({
      ...emptyOccupationForm,
      name: ' Kaynakçı ',
      code: '7212',
    });
    expect(toOccupationInput(parsed)).toEqual({
      name: 'Kaynakçı',
      code: '7212',
      description: null,
      isActive: true,
    });
  });
});
